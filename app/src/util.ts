import { signal } from '@preact/signals';
import { preferDark, getVar } from './helpers.js';

export const dark = signal(preferDark());
dark.subscribe(dark => {
	if (dark) document.body.classList.replace('light', 'dark');
	else document.body.classList.replace('dark', 'light');
});

export function parseColor(input: string) {
	if (input[0] === "#") {
		var collen = (input.length - 1) / 3;
		var fact = [17, 1, 0.062272][collen - 1];
		return {
			r: Math.round(parseInt(input.substring(1, 1 + collen), 16) * fact),
			g: Math.round(parseInt(input.substring(1 + collen, 1 + 2 * collen), 16) * fact),
			b: Math.round(parseInt(input.substring(1 + 2 * collen, 1 + 3 * collen), 16) * fact),
			a: 1.0,
		};
	}
	else {
		const split = input
			.split(",")
			.map(x => +x);
		return {
			r: split[0],
			g: split[1],
			b: split[2],
			a: 1,
		};
	}
}
export function normalize(c: GPUColorDict) {
	return {
		r: c.r / 255,
		g: c.g / 255,
		b: c.b / 255,
		a: c.a,
	};
}
export function getBgColor() {
	return normalize(parseColor(getVar('--bg')));
}
