import { readFileSync } from 'fs';
import { join } from 'path';
import { spawn } from 'node:child_process';

const tsc = spawn('./node_modules/.bin/tsc', [
	'--build',
	'--watch',
	'--preserveWatchOutput',
	'--pretty',
	'--assumeChangesOnlyAffectDirectDependencies',
]);
tsc.stdout.on('data', data => {
	const str = data.toString().trim();
	// We know, tsc...
	if (
		str.includes('Starting incremental compilation...') ||
		str.includes('Starting compilation in watch mode...')
	) return;
	console.log(`[tsc] ${str}`);
});
tsc.stderr.on('data', data => console.error(`[tsc] ${data.toString().trim()}`));

function readPackageJson(p) {
	return JSON.parse(readFileSync(join(p, 'package.json'), 'utf8'));
}

const { workspaces } = readPackageJson('.');
workspaces
	.filter(w => {
		const p = readPackageJson(w);
		return p.scripts && p.scripts.watch;
	})
	.forEach(w => {
		const watcher = spawn('npm', ['run', '-w', w, 'watch']);
		watcher.stdout.on('data', data => console.log(`[${w}] ${data.toString().trim()}`));
		watcher.stderr.on('data', data => console.error(`[${w}] ${data.toString().trim()}`));
	});
