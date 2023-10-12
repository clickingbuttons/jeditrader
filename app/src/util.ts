import { signal } from '@preact/signals';
import { preferDark, getVar } from './helpers.js';

export const dark = signal(preferDark());
dark.subscribe(dark => {
	if (dark) document.body.classList.replace('light', 'dark');
	else document.body.classList.replace('dark', 'light');
});

export type RGB = [number, number, number];
export type RGBA = [...RGB, number];

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

function isTypedArray(obj: any) {
  const TypedArray = Object.getPrototypeOf(Uint8Array);
  return obj instanceof TypedArray;
}

function rgbaNormToHex(r: number, g: number, b: number, a: number): string | undefined {
	if (r > 1 || g > 1 || b > 1 || a < 0 || a > 1) return;
  return '#'
		+ Math.round(r * 255 * a).toString(16).padStart(2, '0')
		+ Math.round(g * 255 * a).toString(16).padStart(2, '0')
		+ Math.round(b * 255 * a).toString(16).padStart(2, '0');
}

const colorDiv = document.createElement('div');
document.body.appendChild(colorDiv);
export function getColor(obj: any): string | undefined {
	if (Array.isArray(obj) || isTypedArray(obj)) {
		if (obj.length < 3 || obj.length > 4) return;
		return rgbaNormToHex(obj[0], obj[1], obj[2], obj[3] ?? 1);
	} else if (typeof obj === 'string') {
		colorDiv.style.color = obj;
		const m = getComputedStyle(colorDiv).color.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
		if (m) return rgbaNormToHex(+m[1], +m[2], +m[3], 1);
	}
}

export function hexToRGBNorm(hex: string): RGB {
	var r = parseInt(hex.slice(1, 3), 16) / 255,
			g = parseInt(hex.slice(3, 5), 16) / 255,
			b = parseInt(hex.slice(5, 7), 16) / 255;

	return [r, g, b];
}

