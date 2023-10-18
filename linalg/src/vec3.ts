import { Vector } from './vec.js';

export class Vec3 extends Vector<Vec3> {
	get x(): number { return this[0]; }
	set x(n: number) { this[0] = n; }
	get y(): number { return this[1]; }
	set y(n: number) { this[1] = n; }
	get z(): number { return this[2]; }
	set z(n: number) { this[2] = n; }

	constructor(x: number, y?: number, z?: number) {
		super([x, y ?? x, z ?? x], Vec3.f64);
	}

	static f64(arr: Float64Array): Vec3 {
		return new Vec3(arr[0], arr[1], arr[2]);
	}

	cross(v: Vec3): Vec3 {
		return new Vec3(
			this.y * v.z - this.z * v.y,
			this.z * v.x - this.x * v.z,
			this.x * v.y - this.y * v.x,
		);
	}

	basis(): [Vec3, Vec3, Vec3] {
		const res: Vec3[] = [this];
		const normalized = this.normalize();

		// TODO: find proof at least 2/3 will be unique
		const potential = [
			normalized.cross(new Vec3(1, 0, 0)),
			normalized.cross(new Vec3(0, 1, 0)),
			normalized.cross(new Vec3(0, 0, 1)),
		];
		potential.forEach(v => {
			if (!v.eq(new Vec3(0)) && res.every(u => !u.abs().eq(v.abs()))) res.push(v);
		});

		return res.slice(0, 3) as [Vec3, Vec3, Vec3];
	}
}
