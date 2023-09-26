import { clamp } from './util.js';

export class Vec3 extends Float64Array {
	get x(): number { return this[0]; }
	set x(n: number) { this[0] = n; }
	get y(): number { return this[1]; }
	set y(n: number) { this[1] = n; }
	get z(): number { return this[2]; }
	set z(n: number) { this[2] = n; }

	clone(): Vec3 {
		return new Vec3(this);
	}

	add(v: Vec3): Vec3 {
		return new Vec3([this.x + v.x, this.y + v.y, this.z + v.z]);
	}

	sub(v: Vec3): Vec3 {
		return new Vec3([this.x - v.x, this.y - v.y, this.z - v.z]);
	}

	mul(v: Vec3): Vec3 {
		return new Vec3([this.x * v.x, this.y * v.y, this.z * v.z]);
	}

	div(v: Vec3): Vec3 {
		return new Vec3([this.x / v.x, this.y / v.y, this.z / v.z]);
	}

	mulScalar(n: number): Vec3 {
		return new Vec3([this.x * n, this.y * n, this.z * n]);
	}

	divScalar(n: number): Vec3 {
		return new Vec3([this.x / n, this.y / n, this.z / n]);
	}

	cross(v: Vec3): Vec3 {
		return new Vec3([
			this.y * v.z - this.z * v.y,
			this.z * v.x - this.x * v.z,
			this.x * v.y - this.y * v.x,
		]);
	}

	dot(v: Vec3): number {
		return (this.x * v.x) + (this.y * v.y) + (this.z * v.z);
	}

	normalize(): Vec3 {
		const len = Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2);
		if (len > 1e-5) return new Vec3([this.x / len, this.y / len, this.z / len]);
		return new Vec3([0, 0, 0]);
	}

	lerp(v: Vec3, t: number): Vec3 {
		return new Vec3([
			this.x + t * (v.x - this.x),
			this.y + t * (v.y - this.y),
			this.z + t * (v.z - this.z)
		]);
	}

	clamp(min: Vec3, max: Vec3): Vec3 {
		return new Vec3([
			clamp(this.x, min.x, max.x),
			clamp(this.y, min.y, max.y),
			clamp(this.z, min.z, max.z),
		]);
	}

	f32Low() {
		return new Float32Array(this.map(v => v - Math.fround(v)));
	}

	eq(v: Vec3): boolean {
		return this.x === v.x && this.y === v.y && this.z === v.z;
	}
}
