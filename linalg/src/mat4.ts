import { Vec3 } from './vec3.js';

export class Mat4 {
	elements: [
		number, number, number, number, // column 1
		number, number, number, number, // column 2
		number, number, number, number, // column 3
		number, number, number, number, // column 4
	];

	constructor(
		v00: number, v01: number, v02: number, v03: number,
		v04: number, v05: number, v06: number, v07: number,
		v08: number, v09: number, v10: number, v11: number,
		v12: number, v13: number, v14: number, v15: number
	) {
		this.elements = [
			v00, v01, v02, v03,
			v04, v05, v06, v07,
			v08, v09, v10, v11,
			v12, v13, v14, v15
		];
	}

	static lookAt(eye: Vec3, target: Vec3, up: Vec3): Mat4 {
		const zAxis = eye.sub(target).normalize();
		const xAxis = up.cross(zAxis).normalize();
		const yAxis = zAxis.cross(xAxis).normalize();

		return new Mat4(
			xAxis.x, yAxis.x, zAxis.x, 0,
			xAxis.y, yAxis.y, zAxis.y, 0,
			xAxis.z, yAxis.z, zAxis.z, 0,
			-(xAxis.x * eye.x + xAxis.y * eye.y + xAxis.z * eye.z),
			-(yAxis.x * eye.x + yAxis.y * eye.y + yAxis.z * eye.z),
			-(zAxis.x * eye.x + zAxis.y * eye.y + zAxis.z * eye.z),
			1
		);
	}

	static perspective(fovRad: number, aspect: number, zNear: number, zFar: number): Mat4 {
		const f = Math.tan(Math.PI * 0.5 - 0.5 * fovRad);
		const rangeInv = 1 / (zNear - zFar);

		return new Mat4(
			f / aspect, 0, 0, 0,
			0, f, 0, 0,
			0, 0, zFar * rangeInv, -1,
			0, 0, zFar * zNear * rangeInv, 0
		);
	}

	multiply(m: Mat4): Mat4 {
		const a00 = this.elements[0];
		const a01 = this.elements[1];
		const a02 = this.elements[2];
		const a03 = this.elements[3];
		const a10 = this.elements[ 4 + 0];
		const a11 = this.elements[ 4 + 1];
		const a12 = this.elements[ 4 + 2];
		const a13 = this.elements[ 4 + 3];
		const a20 = this.elements[ 8 + 0];
		const a21 = this.elements[ 8 + 1];
		const a22 = this.elements[ 8 + 2];
		const a23 = this.elements[ 8 + 3];
		const a30 = this.elements[12 + 0];
		const a31 = this.elements[12 + 1];
		const a32 = this.elements[12 + 2];
		const a33 = this.elements[12 + 3];
		const b00 = m.elements[0];
		const b01 = m.elements[1];
		const b02 = m.elements[2];
		const b03 = m.elements[3];
		const b10 = m.elements[ 4 + 0];
		const b11 = m.elements[ 4 + 1];
		const b12 = m.elements[ 4 + 2];
		const b13 = m.elements[ 4 + 3];
		const b20 = m.elements[ 8 + 0];
		const b21 = m.elements[ 8 + 1];
		const b22 = m.elements[ 8 + 2];
		const b23 = m.elements[ 8 + 3];
		const b30 = m.elements[12 + 0];
		const b31 = m.elements[12 + 1];
		const b32 = m.elements[12 + 2];
		const b33 = m.elements[12 + 3];

		return new Mat4(
			a00 * b00 + a10 * b01 + a20 * b02 + a30 * b03,
			a01 * b00 + a11 * b01 + a21 * b02 + a31 * b03,
			a02 * b00 + a12 * b01 + a22 * b02 + a32 * b03,
			a03 * b00 + a13 * b01 + a23 * b02 + a33 * b03,
			a00 * b10 + a10 * b11 + a20 * b12 + a30 * b13,
			a01 * b10 + a11 * b11 + a21 * b12 + a31 * b13,
			a02 * b10 + a12 * b11 + a22 * b12 + a32 * b13,
			a03 * b10 + a13 * b11 + a23 * b12 + a33 * b13,
			a00 * b20 + a10 * b21 + a20 * b22 + a30 * b23,
			a01 * b20 + a11 * b21 + a21 * b22 + a31 * b23,
			a02 * b20 + a12 * b21 + a22 * b22 + a32 * b23,
			a03 * b20 + a13 * b21 + a23 * b22 + a33 * b23,
			a00 * b30 + a10 * b31 + a20 * b32 + a30 * b33,
			a01 * b30 + a11 * b31 + a21 * b32 + a31 * b33,
			a02 * b30 + a12 * b31 + a22 * b32 + a32 * b33,
			a03 * b30 + a13 * b31 + a23 * b32 + a33 * b33,
		);
	}

	f32(): Float32Array {
		return new Float32Array(this.elements);
	}
}
