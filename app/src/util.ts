import { signal } from '@preact/signals';
import { preferDark, getVar } from './helpers.js';

export const dark = signal(preferDark());
dark.subscribe(dark => {
	if (dark) document.body.classList.replace('light', 'dark');
	else document.body.classList.replace('dark', 'light');
});

export type RGBA = [number, number, number, number];

export function parseColor(input: string): RGBA {
	if (input[0] === "#") {
		var collen = (input.length - 1) / 3;
		var fact = [17, 1, 0.062272][collen - 1];
		return [
			Math.round(parseInt(input.substring(1, 1 + collen), 16) * fact),
			Math.round(parseInt(input.substring(1 + collen, 1 + 2 * collen), 16) * fact),
			Math.round(parseInt(input.substring(1 + 2 * collen, 1 + 3 * collen), 16) * fact),
			1.0,
		];
	}
	else {
		const split = input
			.split(",")
			.map(x => +x);
		return [
			split[0],
			split[1],
			split[2],
			1,
		];
	}
}
export function normalize(c: RGBA): RGBA {
	return [
		c[0] / 255,
		c[1] / 255,
		c[2] / 255,
		c[3],
	];
}
export function getBgColor() {
	return normalize(parseColor(getVar('--bg')));
}
