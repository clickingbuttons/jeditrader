import { Vector } from './vec.js';

export class Vec2 extends Vector<Vec2> {
	get x(): number { return this[0]; }
	set x(n: number) { this[0] = n; }
	get y(): number { return this[1]; }
	set y(n: number) { this[1] = n; }

	constructor(x: number, y: number) {
		super([x, y], Vec2.f64);
	}

	static f64(arr: Float64Array): Vec2 {
		return new Vec2(arr[0], arr[1]);
	}
}
