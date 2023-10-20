const colorDiv = document.createElement('div');
document.body.appendChild(colorDiv);
const colorRegex = /^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i;

// Currently using rgba8unorm
export class Color extends Uint8Array {
	get r() { return this[0]; }
	get g() { return this[1]; }
	get b() { return this[2]; }
	get a() { return this[3]; }

	constructor(r: number, g: number, b: number, a: number = 255) {
		super([r, g, b, a]);
	}

	static fromArray(arr: Iterable<number>): Color {
		const rgba: number[] = [];
		let i = 0;
		for (let v of arr) {
			rgba.push(v);
			if (++i > 4) break;
		}

		return new Color(rgba[0], rgba[1], rgba[2], rgba[3]);
	}

	static parse(input: string): Color {
		// Check for r,g,b,a
		let split = input.split(',').map(v => +v).filter(Number.isFinite);
		if (split.every(v => v < 1)) split = split.map(v => v * 255);
		if (split.length === 3) split.push(255);
		if (split.length === 4) return new Color(split[0], split[1], split[2], split[3]);

		colorDiv.style.color = input;
		const m = getComputedStyle(colorDiv).color.match(colorRegex);
		if (m) return new Color(+m[1] * 255, +m[2] * 255, +m[3] * 255);

		return new Color(0, 0, 0);
	}

	static white = new Color(255, 255, 255);
	static red = new Color(255, 0, 0);
	static green = new Color(0, 255, 0);
	static blue = new Color(0, 0, 255);

	hex(): string {
		return '#'
			+ Math.round(this.r * this.a / 255).toString(16).padStart(2, '0')
			+ Math.round(this.g * this.a / 255).toString(16).padStart(2, '0')
			+ Math.round(this.b * this.a / 255).toString(16).padStart(2, '0');
	}

	rgba32float(): Float32Array {
		return new Float32Array(this).map(v => v / 255);
	}

	clone(): Color {
		return new Color(this[0], this[1], this[2], this[3]);
	}

	lerp(v: Color, t: number): Color {
		return Color.fromArray(this.map((val, i) => val + t * (v[i] - val)));
	}
}
