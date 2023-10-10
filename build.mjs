import { readFileSync } from 'fs';
import { join } from 'path';
import { execFileSync } from 'node:child_process';

function readPackageJson(p) {
	return JSON.parse(readFileSync(join(p, 'package.json'), 'utf8'));
}
const { workspaces } = readPackageJson('.');

function runAll(command) {
	workspaces
		.filter(w => {
			const p = readPackageJson(w);
			return p.scripts && p.scripts[command];
		})
		.forEach(w => {
			try {
				execFileSync('npm', ['run', '--workspace', w, command], {
					encoding: 'utf8',
					stdio: 'inherit',
				});
			} catch {
				process.exit(1);
			}
		});
}

console.log('-- generating code');
runAll('gen');

console.log('-- compiling ts');
try {
	execFileSync('./node_modules/.bin/tsc', ['--build'], {
		encoding: 'utf8',
		stdio: 'inherit',
	});
} catch {
	process.exit(1);
}

console.log('-- building app');
runAll('build');

