import { Vector } from './vec.js';
import { Mat4 } from './mat4.js';
import { Vec3 } from './vec3.js';

export class Vec4 extends Vector<Vec4> {
	get x(): number { return this[0]; }
	set x(n: number) { this[0] = n; }
	get y(): number { return this[1]; }
	set y(n: number) { this[1] = n; }
	get z(): number { return this[2]; }
	set z(n: number) { this[2] = n; }
	get w(): number { return this[3]; }
	set w(n: number) { this[3] = n; }

	constructor(x: number | Vec3, y?: number, z?: number, w?: number) {
		if (x instanceof Vec3) {
			super([x.x, x.y, x.z, y ?? 1], Vec4.f64);
		} else {
			y = y ?? x;
			z = z ?? x;
			w = w ?? x;
			super([x, y, z, w], Vec4.f64);
		}
	}

	static f64(arr: Float64Array): Vec4 {
		return new Vec4(arr[0], arr[1], arr[2], arr[3]);
	}

	transform(m: Mat4): Vec4 {
		return new Vec4(
			m[0] * this.x + m[4] * this.y + m[ 8] * this.z + m[12] * this.w,
			m[1] * this.x + m[5] * this.y + m[ 9] * this.z + m[13] * this.w,
			m[2] * this.x + m[6] * this.y + m[10] * this.z + m[14] * this.w,
			m[3] * this.x + m[7] * this.y + m[11] * this.z + m[15] * this.w,
		);
	}

	xyz(): Vec3 {
		return new Vec3(this.x, this.y, this.z);
	}
}
