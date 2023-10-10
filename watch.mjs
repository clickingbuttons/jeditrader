import { readFileSync } from 'fs';
import { join } from 'path';
import { spawn } from 'node:child_process';

const tsc = spawn('./node_modules/.bin/tsc', ['--build', '--watch']);
tsc.stdout.on('data', data => {
	// Dumb terminal clear character that ruins output.
	if (data[0] == 0x1b && data[1] == 0x63) return;
	console.log(`[tsc] ${data.toString().trim()}`);
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
