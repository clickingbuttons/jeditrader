const fs = require('fs').promises;
const path = require('path');
const wgsl = require('@use-gpu/shader/wgsl');
const chokidar = require('chokidar');

const srcdir = 'src';
const outdir = 'src/gen';
const typesfile = 'src/types';
const ext = '.wgsl';
const vertExt = `.vert${ext}`;
const fragExt = `.frag${ext}`;
const srcGlob = `${srcdir}/**/*${ext}`;
const watchMode = process.argv[2] === '--watch';

// Lower binding numbers are given to these so that render passes may only bind them once.
const globalBindingPrefix = 'g_';

// node_modules/@use-gpu/shader/cjs/wgsl/bind.js:170
global.GPUShaderStage = {
	VERTEX: 1,
	FRAGMENT: 2,
	COMPUTE: 4,
};

const bundles = {
	// modName(fname): wgsl.ParsedModule
};


function modName(fname) {
	return './' + path.relative(srcdir, fname);
}

const groupRegex = /group\s*\(\s*(\w+)\s*\)/;
function groupPass(group) {
	return group.replace(groupRegex, (_, m) => m);
}

function sortBindGroups(a, b) {
	const aGlobal = a.startsWith(globalBindingPrefix);
	const bGlobal = b.startsWith(globalBindingPrefix);
	if (aGlobal && bGlobal) return 0;
	if (aGlobal && !bGlobal) return -1;
	return 1;
}

function extractBindGroups(bindings) {
	const variables = bindings.map(b => b.variable);
	const attributes = variables.map(v => v.attr).flat();
	const groupAttributes = attributes
		.filter(a => groupRegex.test(a))
		.map(groupPass);

	return Array.from(new Set(groupAttributes)).sort(sortBindGroups);
}

async function compileWGSL(fname) {
	const source = await fs.readFile(fname, { encoding: 'utf8' });
	const name = modName(fname);

	try {
		const module = wgsl.loadModule(source, name);
		module.table.bindings = module.table.bindings ?? [];
		bundles[name] = { module };
	} catch (e) {
		if (watchMode) {
			console.error(e);
			return;
		} else {
			throw e;
		}
	}

	return name;
}

async function walkModules() {
	const watcher = chokidar.watch(srcGlob, { persistent: false });

	const promises = [];
	watcher.on('add', fname => promises.push(compileWGSL(fname)));

	return new Promise(res => watcher.on('ready', () => res(Promise.all(promises))));
}

function titleCase(str) {
	return str.split(/[_\.-]/)
		.map(w => w[0].toUpperCase() + w.substring(1).toLowerCase())
		.join('');
}

function symbol(fname) {
	const titled = titleCase(fname);
	return titled[0].toLowerCase() + titled.substring(1);
}

// See GPUBindGroupLayoutEntry
function bindGroupInterface(pass, bg) {
	// type GPUBindingResource =
	//	|GPUSampler
	//	|GPUTextureView
	//	|GPUBufferBinding
	//	|GPUExternalTexture;
	function resource(layoutEntry) {
		if (layoutEntry.buffer) return 'GPUBufferBinding';
		if (layoutEntry.sampler) return 'GPUSampler'
		if (layoutEntry.texture) return 'GPUTextureView';

		throw new Error(`unknown resource for layout ${layoutEntry}`);
	}
	return `	export interface ${titleCase(pass)} {
		${Object.entries(bg)
			.map(([k, v]) => `${k}: ${resource(v)};`).join('\n		')}
		[k: string]: GPUBindingResource;
	};`;
}

function isMain(mb) {
	const table = mb?.table ?? mb?.module?.table;
	return table?.visibles?.includes('main');
}

function groupKey(g) {
	return `group(${g})`;
}

function stripNs(v) {
	return v.replace(/^_\d+_/, '');
}

function getTableBindings0(acc, b) {
	acc.push(...(b.module.table.bindings ?? []));
	Object.values(b.libs).forEach(l => getTableBindings0(acc, l));
	return acc;
}

function getTableBindings(b) {
	return getTableBindings0([], b);
}

function shaderType(b) {
	const name = b.module.name;
	if (name.endsWith(vertExt)) return 'vert';
	if (name.endsWith(fragExt)) return 'frag';

	return 'compute';
}

function getDeps0(acc, b) {
	acc.push(b);
	Object.values(b.libs).forEach(l => getDeps0(acc, l));
	return acc;
}

function getDeps(b) {
	return getDeps0([], b);
}

function getVisibility(b, groupName) {
	if (groupName.startsWith(globalBindingPrefix))
		return GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT;

	const type = shaderType(b);
	if (type === 'vert') return GPUShaderStage.VERTEX;
	if (type === 'frag') return GPUShaderStage.FRAGMENT;

	return GPUShaderStage.COMPUTE;
}

function genTs(b, bindGroupLayouts) {
	const allBindings = [b, ...Object.values(bundles)].map(b => getTableBindings(b)).flat();

	const bindGroups = extractBindGroups(getTableBindings(b));
	bindGroups.forEach((g, i) => {
		const group = groupKey(g);
		let stages = [[b], getDeps(b)]; // For extracting imported bindings
		const bindings = wgsl.extractBindings(stages, g);
		if (!bindings.length) return;

		bindGroupLayouts[g] = bindings.reduce((acc, cur) => {
			const bindingKey = `binding(${cur.binding})`;
			const variable = allBindings.map(b => b.variable)
				.find(v => v.attr.includes(group) && v.attr.includes(bindingKey));
			if (!variable) console.warn(`${b.module.name} no variable found for ${group} ${bindingKey}`);
			cur.visibility = getVisibility(b, g);

			acc[variable ? stripNs(variable.name) : i.toString()] = cur;
			return acc;
		}, {});
	});

	return wgsl.linkBundle(b);
}

function outPath(b) {
	return path.join(outdir, b.module.name + '.ts');
}

async function writeTs(b) {
	if (!isMain(b)) return;

	const tsPath = outPath(b);
	const paths = {
		ts: tsPath,
		types: path.relative(path.dirname(tsPath), typesfile),
	};

	const bindGroupLayouts = {};
	const code = genTs(b, bindGroupLayouts);

	// const structs = bundle.module.table.visibles
	// 	.filter(b => b !== 'main')
	// 	.map(v => {
	// 		const bundle = wgsl.bindEntryPoint(m, v);
	// 		return wgsl.bundleToAttribute(bundle);
	// 	});

	const basename = path.basename(paths.ts, ext + '.ts');
	const ts = `// Generated by ${__filename}
import type { BindGroupLayouts } from './${paths.types}.js';

const bindGroupLayouts: BindGroupLayouts = ${JSON.stringify(bindGroupLayouts, null, '\t')};

export namespace ${titleCase(basename)}Resources {
${Object.entries(bindGroupLayouts)
	.map(([pass, bg]) => bindGroupInterface(pass, bg))
	.join('\n\n')}
}

export const ${symbol(basename)} = {
	code: \`\n${code}\`,
	bindGroupLayouts,
};
`;
	await fs.mkdir(path.dirname(paths.ts), { recursive: true });
	await fs.writeFile(paths.ts, ts);

	return paths.ts;
}

async function writeIndex() {
	const outpath = path.join(outdir, 'index.ts');
	await fs.mkdir(path.dirname(outpath), { recursive: true });

	const outpaths = Object.values(bundles)
		.filter(b => isMain(b))
		.map(b => outPath(b))
	const index = Array.from(new Set(outpaths))
		.map(outpath => `export * from './${path.relative(outdir, outpath).replace(/.ts$/, '.js')}';`)
		.join('\n');
	await fs.writeFile(outpath, index);
}

function resolveBundleLibs(b) {
	const m = b.module;
	const modDir = path.dirname(m.name);
	b.libs = (m.table.modules ?? []).reduce((acc, cur) => {
		let absPath = path.join(modDir, cur.name);
		if (!absPath.startsWith('.')) absPath = './' + absPath;

		if (!(absPath in bundles)) {
			console.warn(`could not resolve "${absPath}" from "${
				path.join(srcdir, modDir)}". options are: ${
				Object.keys(bundles).join(' ')}`);
			return acc;
		}
		acc[cur.name] = bundles[absPath];
		return acc;
	}, {});
}

async function compileAndGen(fname) {
	const name = modName(fname);
	if (watchMode) {
		await compileWGSL(fname);
		console.log('added', name)
		resolveBundleLibs(bundles[name]);
	}

	let affected = [bundles[name]];
	if (watchMode) {
		// TODO: make dep tree and invalidate parts of it.
		affected = Object.values(bundles);
		affected.forEach(b => resolveBundleLibs(b));
	}

	for (let i = 0; i < affected.length; i++) {
		const b = affected[i];
		const outpath = await writeTs(b);
		if (outpath) console.log(fname, '->', outpath);
	}
}

async function remove(fname) {
	const name = modName(fname);
	delete bundles[name];

	// TODO: make dep tree and invalidate parts of it.
	const affected = Object.values(bundles);

	for (let i = 0; i < affected.length; i++) {
		const b = affected[i];
		resolveBundleLibs(b);
		const outpath = await writeTs(b);
		if (outpath) console.log(fname, '->', outpath);
	}
}

async function main() {
	// Prepass to gather all possible used modules
	await walkModules();
	Object.values(bundles).forEach(resolveBundleLibs);

	const watcher = chokidar.watch(srcGlob, {
		persistent: watchMode,
		ignoreInitial: watchMode,
	});
	watcher.on('add', async fname => {
		await compileAndGen(fname).catch(e => console.error(e));
		await writeIndex();
	});
	watcher.on('change', fname => {
		compileAndGen(fname).catch(e => console.error(e));
	});
	watcher.on('unlink', async fname => {
		await remove(fname).catch(e => console.error(e));
		await writeIndex();
	});
}

main();
