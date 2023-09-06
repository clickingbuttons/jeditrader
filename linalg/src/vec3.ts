import { Vec2 } from './vec2.js';

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(n, max));
}

export class Vec3 {
	// TODO: bench best backing store
	x: number;
	y: number;
	z: number;

	constructor(x: number, y: number, z: number) {
		this.x = x;
		this.y = y;
		this.z = z;
	}

	clone(): Vec3 {
		return new Vec3(this.x, this.y, this.z);
	}

	add(v: Vec3): Vec3 {
		return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z);
	}

	sub(v: Vec3): Vec3 {
		return new Vec3(this.x - v.x, this.y - v.y, this.z - v.z);
	}

	mul(v: Vec3): Vec3 {
		return new Vec3(this.x * v.x, this.y * v.y, this.z * v.z);
	}

	div(v: Vec3): Vec3 {
		return new Vec3(this.x / v.x, this.y / v.y, this.z / v.z);
	}

	mulScalar(n: number): Vec3 {
		return new Vec3(this.x * n, this.y * n, this.z * n);
	}

	divScalar(n: number): Vec3 {
		return new Vec3(this.x / n, this.y / n, this.z / n);
	}

	cross(v: Vec3): Vec3 {
		return new Vec3(
			this.y * v.z - this.z * v.y,
			this.z * v.x - this.x * v.z,
			this.x * v.y - this.y * v.x,
		);
	}

	dot(v: Vec3): number {
		return (this.x * v.x) + (this.y * v.y) + (this.z * v.z);
	}

	normalize(): Vec3 {
		const len = Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2);
		if (len > 1e-5) {
			return new Vec3(
				this.x / len,
				this.y / len,
				this.z / len
			);
		}
		return new Vec3(0, 0, 0);
	}

	lerp(v: Vec3, t: number): Vec3 {
		return new Vec3(
			this.x + t * (v.x - this.x),
			this.y + t * (v.y - this.y),
			this.z + t * (v.z - this.z)
		);
	}

	elements(): [number, number, number] {
		return [this.x, this.y, this.z];
	}

	elementsLow(): [number, number, number] {
		return this.elements().map(v => v - Math.fround(v)) as [number, number, number];
	}

	f32(): Float32Array {
		return new Float32Array(this.elements());
	}

	f32Low(): Float32Array {
		return new Float32Array(this.elementsLow());
	}

	xy(): Vec2 {
		return new Vec2(this.x, this.y);
	}

	clamp(min: Vec3, max: Vec3): Vec3 {
		return new Vec3(
			clamp(this.x, min.x, max.x),
			clamp(this.y, min.y, max.y),
			clamp(this.z, min.z, max.z),
		);
	}
}
