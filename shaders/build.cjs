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
	const table = mb.table ?? mb.module.table;
	return table?.visibles.includes('main');
}

function groupKey(g) {
	return `group(${g})`;
}

function stripNs(v) {
	return v.replace(/^_\d+_/, '');
}

function setDefines(b, defines) {
	if (!b) return;
	b.defines = defines;
	(Object.values(b.libs ?? [])).forEach(b => setDefines(b, defines));
}

function getTableBindings(b) {
	return b.module.table?.bindings ?? [];
}

function genTs(stages, bindGroupLayouts) {
	const allBindings = Object.values(stages)
		.map(b => [
			getTableBindings(b),
			...Object.values(b.libs ?? []).map(getTableBindings)
		])
		.flat(2);

	const bindGroups = extractBindGroups(allBindings);
	const bindGroupMap = {
		// '@group(g_view)': '@group(0)'
	};
	bindGroups.forEach((g, i) => {
		const key = groupKey(g);
		const stages2 = Object.values(stages).map(b => [b]);
		stages2[0].push(...Object.values(bundles)); // For extracting imported bindings
		const bindings = wgsl.extractBindings(stages2, g);
		if (!bindings.length) return;

		const bindGroup = bindings.reduce((acc, cur) => {
			const bindingKey = `binding(${cur.binding})`;
			const variable = allBindings.map(b => b.variable)
				.find(v => v.attr.includes(key) && v.attr.includes(bindingKey));
			if (!variable) console.warn(`no variable found for binding ${JSON.stringify(cur)}`);

			acc[variable ? stripNs(variable.name) : i.toString()] = cur;
			return acc;
		}, {});
		bindGroupLayouts[g] = bindGroup;
		bindGroupMap[`@group(${g})`] = `@group(${i})`;
	});
	// Fix defines for all child bundles
	setDefines(stages.vert, bindGroupMap);
	setDefines(stages.frag, bindGroupMap);
	setDefines(stages.code, bindGroupMap);

	return {
		vert: stages.vert && wgsl.linkBundle(stages.vert),
		frag: stages.frag && wgsl.linkBundle(stages.frag),
		code: stages.code && wgsl.linkBundle(stages.code),
	};
}

async function writeTs(modName) {
	let b = bundles[modName];
	if (!isMain(b)) return;

	const tsPath = path.join(outdir, b.module.name + '.ts');
	b.paths = {
		ts: tsPath,
		types: path.relative(path.dirname(tsPath), typesfile),
	};

	const stages = {
		vert: Object.values(bundles).find(b => b.module.name === modName.replace(fragExt, vertExt)),
		frag: Object.values(bundles).find(b => b.module.name === modName.replace(vertExt, fragExt)),
	};
	if (stages.vert && stages.frag) {
		b.paths.ts = b.paths.ts.replace(fragExt, ext).replace(vertExt, ext);
	}
	if (!stages.vert && !stages.frag) stages.code = b;

	const bindGroupLayouts = {};
	let { vert, frag, code } = genTs(stages, bindGroupLayouts);
	// 2nd pass to resolve @group(g_view)
	// code = genTs({ module: wgsl.loadModule(code), libs: b.libs }, bindGroupLayouts, b);

	// const structs = bundle.module.table.visibles
	// 	.filter(b => b !== 'main')
	// 	.map(v => {
	// 		const bundle = wgsl.bindEntryPoint(m, v);
	// 		return wgsl.bundleToAttribute(bundle);
	// 	});

	const basename = path.basename(b.paths.ts, ext + '.ts');
	const ts = `// Generated by ${__filename}
import type { BindGroupLayouts } from './${b.paths.types}.js';

const bindGroupLayouts: BindGroupLayouts = ${JSON.stringify(bindGroupLayouts, null, '\t')};

export namespace ${titleCase(basename)}Resources {
${Object.entries(bindGroupLayouts)
	.map(([pass, bg]) => bindGroupInterface(pass, bg))
	.join('\n\n')}
}

export const ${symbol(basename)} = {
	${vert ? `vert: \n\`${vert}\`,` : ''}
	${frag ? `frag: \n\`${frag}\`,` : ''}
	${code ? `code: \n\`${code}\`,` : ''}
	bindGroupLayouts,
};
`;
	await fs.mkdir(path.dirname(b.paths.ts), { recursive: true });
	await fs.writeFile(b.paths.ts, ts);

	return b.paths.ts;
}

async function writeIndex() {
	const outpath = path.join(outdir, 'index.ts');
	await fs.mkdir(path.dirname(outpath), { recursive: true });

	const outpaths = Object.values(bundles)
		.map(b => b.paths?.ts)
		.filter(Boolean);
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

		if (!absPath in bundles) console.warn(`could not resolve ${cur.name} from ${m.name}`);
		acc[cur.name] = bundles[absPath];
		return acc;
	}, {});
}

async function compileAndGen(fname) {
	const name = modName(fname);
	if (watchMode) {
		await compileWGSL(fname);
		resolveBundleLibs(bundles[name]);
	}

	let affected = [name];
	if (watchMode) {
		// TODO: make dep tree and invalidate parts of it.
		affected = Object.keys(bundles);
		for (let i = 0; i < affected.length; i++) {
			const bundle = bundles[affected[i]];
			resolveBundleLibs(bundle);
		}
	}

	for (let i = 0; i < affected.length; i++) {
		const outpath = await writeTs(affected[i]);
		if (outpath) console.log(fname, '->', outpath);
	}
}

async function main() {
	if (require('fs').existsSync(outdir)) await fs.rm(outdir, { recursive: true });
	// Prepass to gather all possible used modules
	await walkModules();
	Object.values(bundles).forEach(resolveBundleLibs);

	const watcher = chokidar.watch(srcGlob, { persistent: watchMode });
	watcher.on('add', async fname => {
		await compileAndGen(fname);
		writeIndex();
	});
	watcher.on('change', fname => compileAndGen(fname));
}

main();
