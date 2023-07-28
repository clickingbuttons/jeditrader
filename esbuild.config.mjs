import { sep, resolve } from 'path'
import htmlPlugin from 'esbuild-plugin-template'
import copyPlugin from 'esbuild-copy-static-files'
import { glsl } from 'esbuild-plugin-glsl';

const outdir = 'dist';
const routes = ['index', 'chart', 'signin'];
const tsconfig = resolve(process.cwd(), './tsconfig.json');

function htmlConfig() {
	return routes.map(r => ({
		filename: `${r}.html`,
		template(result, initialOptions) {
			const outputs = (Object.keys(result?.metafile?.outputs ?? []));
			const stripBase = f => f.replace(initialOptions.outdir + sep, '');
			const stylesheets = outputs.filter(f => f.endsWith('.css')).map(stripBase);
			const scripts = outputs.filter(f => f.endsWith('.js')).map(stripBase);

			return `<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8">
		<title>JediTrader Chart</title>
		<link rel="stylesheet" type="text/css" href="minireset.css" />
		${stylesheets.map(f => `<link rel="stylesheet" href="${f}"></script>`).join('\n')}
	</head>
	<body class="dark">
		<div id="root"></div>
		${scripts.map(f => `<script src="${f}"></script>`).join('\n')}
	</body>
</html>`
		}
}))
};

export const esbuildConfig = ({ isProd }) => ({
	entryPoints: ['src/main.tsx'],
	entryNames: `[dir]/[name]${isProd ? '.[hash]' : ''}`,
	metafile: true,
	bundle: true,
	sourcemap: isProd ? 'external' : 'inline',
	minify: isProd,
	outdir,
	tsconfig,
	plugins: [
		htmlPlugin(htmlConfig(isProd)),
		copyPlugin({
			src: 'static',
			dest: outdir,
		}),
		glsl({
			minify: isProd
		}),
	]
})

