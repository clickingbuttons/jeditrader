import { clamp } from './util.js';

export class Vector<T extends Float64Array> extends Float64Array {
	// Allows subclasses to return their own type for convenience.
	ty: (arr: Float64Array) => T;

	constructor(numbers: number[], ty: (arr: Float64Array) => T) {
		super(numbers);
		this.ty = ty;
	}

	clone(): T {
		return this.ty(this);
	}

	add(v: T): T {
		return this.ty(this.map((val, i) => val + v[i]));
	}

	sub(v: T): T {
		return this.ty(this.map((val, i) => val - v[i]));
	}

	div(v: T): T {
		return this.ty(this.map((val, i) => val / v[i]));
	}

	mul(v: T): T {
		return this.ty(this.map((val, i) => val * v[i]));
	}

	addScalar(n: number): T {
		return this.ty(this.map(val => val + n));
	}

	subScalar(n: number): T {
		return this.ty(this.map(val => val - n));
	}

	mulScalar(n: number): T {
		return this.ty(this.map(val => val * n));
	}

	divScalar(n: number): T {
		return this.ty(this.map(val => val / n));
	}

	dot(v: T): number {
		return this.map((val, i) => val * v[i]).reduce((acc, cur) => acc + cur, 0);
	}

	normalize(): T {
		const len = Math.sqrt(this.dot(this as any));
		if (len > 1e-5) return this.divScalar(len);
		return this.ty(this.map(_ => 0));
	}

	lerp(v: T, t: number): T {
		return this.ty(this.map((val, i) => val + t * (v[i] - val)));
	}

	clamp(min: T, max: T): T {
		return this.ty(this.map((val, i) => clamp(val, min[i], max[i])));
	}

	magnitude(): number {
		return Math.sqrt(this.reduce((acc, cur) => acc + (cur * cur)));
	}

	eq(v: T): boolean {
		return this.every((val, i) => val === v[i]);
	}

	f32Low() {
		return new Float32Array(this.map(v => v - Math.fround(v)));
	}

	proj(onto: T): T {
		return this.mulScalar(this.dot(onto) / onto.reduce((acc, cur) => acc + cur * cur, 0));
	}

	abs(): T {
		return this.ty(this.map(val => Math.abs(val)));
	}
};
