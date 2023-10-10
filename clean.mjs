import { rmSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execFileSync } from 'node:child_process';

execFileSync('./node_modules/.bin/tsc', ['--build', '--clean'], { encoding: 'utf8' });

function rmRf(d) {
	if (existsSync(d)) rmSync(d, { recursive: true });
}

const { workspaces } = JSON.parse(readFileSync('./package.json', 'utf8'));
workspaces.forEach(w => {
	rmRf(join(w, 'dist'));
	rmRf(join(w, 'src/gen'));
});
