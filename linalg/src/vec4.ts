import { clamp } from './util.js';
import { Mat4 } from './mat4.js';

export class Vec4 extends Float64Array {
	get x(): number { return this[0]; }
	set x(n: number) { this[0] = n; }
	get y(): number { return this[1]; }
	set y(n: number) { this[1] = n; }
	get z(): number { return this[2]; }
	set z(n: number) { this[2] = n; }
	get w(): number { return this[3]; }
	set w(n: number) { this[3] = n; }

	clone(): Vec4 {
		return new Vec4(this);
	}

	add(v: Vec4): Vec4 {
		return new Vec4([this.x + v.x, this.y + v.y, this.z + v.z, this.w + v.w]);
	}

	sub(v: Vec4): Vec4 {
		return new Vec4([this.x - v.x, this.y - v.y, this.z - v.z, this.w - v.w]);
	}

	mul(v: Vec4): Vec4 {
		return new Vec4([this.x * v.x, this.y * v.y, this.z * v.z, this.w * v.w]);
	}

	div(v: Vec4): Vec4 {
		return new Vec4([this.x / v.x, this.y / v.y, this.z / v.z, this.w / v.w]);
	}

	mulScalar(n: number): Vec4 {
		return new Vec4([this.x * n, this.y * n, this.z * n, this.w * n]);
	}

	divScalar(n: number): Vec4 {
		return new Vec4([this.x / n, this.y / n, this.z / n, this.w / n]);
	}

	cross(v: Vec4): Vec4 {
		return new Vec4([
			this.y * v.z - this.z * v.y,
			this.z * v.x - this.x * v.z,
			this.x * v.y - this.y * v.x,
			this.w * v.w - this.w * v.w,
		]);
	}

	dot(v: Vec4): number {
		return (this.x * v.x) + (this.y * v.y) + (this.z * v.z) + (this.w * v.w);
	}

	normalize(): Vec4 {
		const len = Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2 + this.w ** 2);
		if (len > 1e-5) return new Vec4([this.x / len, this.y / len, this.z / len, this.w / len]);
		return new Vec4([0, 0, 0, 0]);
	}

	lerp(v: Vec4, t: number): Vec4 {
		return new Vec4([
			this.x + t * (v.x - this.x),
			this.y + t * (v.y - this.y),
			this.z + t * (v.z - this.z),
			this.w + t * (v.w - this.w),
		]);
	}

	clamp(min: Vec4, max: Vec4): Vec4 {
		return new Vec4([
			clamp(this.x, min.x, max.x),
			clamp(this.y, min.y, max.y),
			clamp(this.z, min.z, max.z),
			clamp(this.w, min.w, max.w),
		]);
	}

	f32() {
		return new Float32Array(this);
	}

	f32Low() {
		return new Float32Array(this.map(v => v - Math.fround(v)));
	}

	transform(m: Mat4): Vec4 {
		return new Vec4([
			m[0] * this.x + m[4] * this.y + m[ 8] * this.z + m[12] * this.w,
			m[1] * this.x + m[5] * this.y + m[ 9] * this.z + m[13] * this.w,
			m[2] * this.x + m[6] * this.y + m[10] * this.z + m[14] * this.w,
			m[3] * this.x + m[7] * this.y + m[11] * this.z + m[15] * this.w,
		]);
	}

	magnitude(): number {
		return Math.sqrt(this.reduce((acc, cur) => acc + cur * cur));
	}
}
