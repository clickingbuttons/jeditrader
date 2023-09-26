import { Vec3 } from './vec3.js';

export class Mat4 extends Float64Array {
	static lookAt(eye: Vec3, target: Vec3, up: Vec3): Mat4 {
		const zAxis = eye.sub(target).normalize();
		const xAxis = up.cross(zAxis).normalize();
		const yAxis = zAxis.cross(xAxis).normalize();

		return new Mat4([
			xAxis.x, yAxis.x, zAxis.x, 0,
			xAxis.y, yAxis.y, zAxis.y, 0,
			xAxis.z, yAxis.z, zAxis.z, 0,
			-(xAxis.x * eye.x + xAxis.y * eye.y + xAxis.z * eye.z),
			-(yAxis.x * eye.x + yAxis.y * eye.y + yAxis.z * eye.z),
			-(zAxis.x * eye.x + zAxis.y * eye.y + zAxis.z * eye.z),
			1
		]);
	}

	static perspective(fovRad: number, aspect: number, zNear: number, zFar: number): Mat4 {
		const f = Math.tan(Math.PI * 0.5 - 0.5 * fovRad);
		const rangeInv = 1 / (zNear - zFar);

		return new Mat4([
			f / aspect, 0, 0, 0,
			0, f, 0, 0,
			0, 0, zFar * rangeInv, -1,
			0, 0, zFar * zNear * rangeInv, 0
		]);
	}

	mul(m: Mat4): Mat4 {
		const a00 = this[0];
		const a01 = this[1];
		const a02 = this[2];
		const a03 = this[3];
		const a10 = this[ 4 + 0];
		const a11 = this[ 4 + 1];
		const a12 = this[ 4 + 2];
		const a13 = this[ 4 + 3];
		const a20 = this[ 8 + 0];
		const a21 = this[ 8 + 1];
		const a22 = this[ 8 + 2];
		const a23 = this[ 8 + 3];
		const a30 = this[12 + 0];
		const a31 = this[12 + 1];
		const a32 = this[12 + 2];
		const a33 = this[12 + 3];
		const b00 = m[0];
		const b01 = m[1];
		const b02 = m[2];
		const b03 = m[3];
		const b10 = m[ 4 + 0];
		const b11 = m[ 4 + 1];
		const b12 = m[ 4 + 2];
		const b13 = m[ 4 + 3];
		const b20 = m[ 8 + 0];
		const b21 = m[ 8 + 1];
		const b22 = m[ 8 + 2];
		const b23 = m[ 8 + 3];
		const b30 = m[12 + 0];
		const b31 = m[12 + 1];
		const b32 = m[12 + 2];
		const b33 = m[12 + 3];

		return new Mat4([
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
		]);
	}

	static translate(v: Vec3): Mat4 {
		return new Mat4([
			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			v.x, v.y, v.z, 1,
		]);
	}

	static scale(v: Vec3): Mat4 {
		return new Mat4([
			v.x, 0.0, 0.0, 0,
			0.0, v.y, 0.0, 0,
			0.0, 0.0, v.z, 0,
			0.0, 0.0, 0.0, 1,
		]);
	}

	static identity() {
		return Mat4.scale(new Vec3([1, 1, 1]));
	}

	determinant(): number {
		const m00 = this[0 * 4 + 0];
		const m01 = this[0 * 4 + 1];
		const m02 = this[0 * 4 + 2];
		const m03 = this[0 * 4 + 3];
		const m10 = this[1 * 4 + 0];
		const m11 = this[1 * 4 + 1];
		const m12 = this[1 * 4 + 2];
		const m13 = this[1 * 4 + 3];
		const m20 = this[2 * 4 + 0];
		const m21 = this[2 * 4 + 1];
		const m22 = this[2 * 4 + 2];
		const m23 = this[2 * 4 + 3];
		const m30 = this[3 * 4 + 0];
		const m31 = this[3 * 4 + 1];
		const m32 = this[3 * 4 + 2];
		const m33 = this[3 * 4 + 3];

		const tmp0  = m22 * m33;
		const tmp1  = m32 * m23;
		const tmp2  = m12 * m33;
		const tmp3  = m32 * m13;
		const tmp4  = m12 * m23;
		const tmp5  = m22 * m13;
		const tmp6  = m02 * m33;
		const tmp7  = m32 * m03;
		const tmp8  = m02 * m23;
		const tmp9  = m22 * m03;
		const tmp10 = m02 * m13;
		const tmp11 = m12 * m03;

		const t0 = (tmp0 * m11 + tmp3 * m21 + tmp4 * m31) -
							 (tmp1 * m11 + tmp2 * m21 + tmp5 * m31);
		const t1 = (tmp1 * m01 + tmp6 * m21 + tmp9 * m31) -
							 (tmp0 * m01 + tmp7 * m21 + tmp8 * m31);
		const t2 = (tmp2 * m01 + tmp7 * m11 + tmp10 * m31) -
							 (tmp3 * m01 + tmp6 * m11 + tmp11 * m31);
		const t3 = (tmp5 * m01 + tmp8 * m11 + tmp11 * m21) -
							 (tmp4 * m01 + tmp9 * m11 + tmp10 * m21);

		return m00 * t0 + m10 * t1 + m20 * t2 + m30 * t3;
	}

	inverse(): Mat4 {
		const m00 = this[0 * 4 + 0];
		const m01 = this[0 * 4 + 1];
		const m02 = this[0 * 4 + 2];
		const m03 = this[0 * 4 + 3];
		const m10 = this[1 * 4 + 0];
		const m11 = this[1 * 4 + 1];
		const m12 = this[1 * 4 + 2];
		const m13 = this[1 * 4 + 3];
		const m20 = this[2 * 4 + 0];
		const m21 = this[2 * 4 + 1];
		const m22 = this[2 * 4 + 2];
		const m23 = this[2 * 4 + 3];
		const m30 = this[3 * 4 + 0];
		const m31 = this[3 * 4 + 1];
		const m32 = this[3 * 4 + 2];
		const m33 = this[3 * 4 + 3];
		const tmp0  = m22 * m33;
		const tmp1  = m32 * m23;
		const tmp2  = m12 * m33;
		const tmp3  = m32 * m13;
		const tmp4  = m12 * m23;
		const tmp5  = m22 * m13;
		const tmp6  = m02 * m33;
		const tmp7  = m32 * m03;
		const tmp8  = m02 * m23;
		const tmp9  = m22 * m03;
		const tmp10 = m02 * m13;
		const tmp11 = m12 * m03;
		const tmp12 = m20 * m31;
		const tmp13 = m30 * m21;
		const tmp14 = m10 * m31;
		const tmp15 = m30 * m11;
		const tmp16 = m10 * m21;
		const tmp17 = m20 * m11;
		const tmp18 = m00 * m31;
		const tmp19 = m30 * m01;
		const tmp20 = m00 * m21;
		const tmp21 = m20 * m01;
		const tmp22 = m00 * m11;
		const tmp23 = m10 * m01;

		const t0 = (tmp0 * m11 + tmp3 * m21 + tmp4 * m31) -
				(tmp1 * m11 + tmp2 * m21 + tmp5 * m31);
		const t1 = (tmp1 * m01 + tmp6 * m21 + tmp9 * m31) -
				(tmp0 * m01 + tmp7 * m21 + tmp8 * m31);
		const t2 = (tmp2 * m01 + tmp7 * m11 + tmp10 * m31) -
				(tmp3 * m01 + tmp6 * m11 + tmp11 * m31);
		const t3 = (tmp5 * m01 + tmp8 * m11 + tmp11 * m21) -
				(tmp4 * m01 + tmp9 * m11 + tmp10 * m21);

		const d = 1 / (m00 * t0 + m10 * t1 + m20 * t2 + m30 * t3);

		return new Mat4([
			d * t0,
			d * t1,
			d * t2,
			d * t3,
			d * ((tmp1 * m10 + tmp2 * m20 + tmp5 * m30) -
			(tmp0 * m10 + tmp3 * m20 + tmp4 * m30)),
			d * ((tmp0 * m00 + tmp7 * m20 + tmp8 * m30) -
			(tmp1 * m00 + tmp6 * m20 + tmp9 * m30)),
			d * ((tmp3 * m00 + tmp6 * m10 + tmp11 * m30) -
			(tmp2 * m00 + tmp7 * m10 + tmp10 * m30)),
			d * ((tmp4 * m00 + tmp9 * m10 + tmp10 * m20) -
			(tmp5 * m00 + tmp8 * m10 + tmp11 * m20)),
			d * ((tmp12 * m13 + tmp15 * m23 + tmp16 * m33) -
			(tmp13 * m13 + tmp14 * m23 + tmp17 * m33)),
			d * ((tmp13 * m03 + tmp18 * m23 + tmp21 * m33) -
			(tmp12 * m03 + tmp19 * m23 + tmp20 * m33)),
			d * ((tmp14 * m03 + tmp19 * m13 + tmp22 * m33) -
			(tmp15 * m03 + tmp18 * m13 + tmp23 * m33)),
			d * ((tmp17 * m03 + tmp20 * m13 + tmp23 * m23) -
			(tmp16 * m03 + tmp21 * m13 + tmp22 * m23)),
			d * ((tmp14 * m22 + tmp17 * m32 + tmp13 * m12) -
			(tmp16 * m32 + tmp12 * m12 + tmp15 * m22)),
			d * ((tmp20 * m32 + tmp12 * m02 + tmp19 * m22) -
			(tmp18 * m22 + tmp21 * m32 + tmp13 * m02)),
			d * ((tmp18 * m12 + tmp23 * m32 + tmp15 * m02) -
			(tmp22 * m32 + tmp14 * m02 + tmp19 * m12)),
			d * ((tmp22 * m22 + tmp16 * m02 + tmp21 * m12) -
			(tmp20 * m12 + tmp23 * m22 + tmp17 * m02)),
		]);
	}

	transpose(): Mat4 {
		return new Mat4([
			this[ 0], this[ 4], this[ 8], this[12],
			this[ 1], this[ 5], this[ 9], this[13],
			this[ 2], this[ 6], this[10], this[14],
			this[ 3], this[ 7], this[11], this[15],
		]);
	}

	clone(): Mat4 {
		return new Mat4(this);
	}

	print() {
		console.log([
			[this[0], this[1], this[2], this[3]].join(' '),
			[this[4], this[5], this[6], this[7]].join(' '),
			[this[8], this[9], this[10], this[11]].join(' '),
			[this[12], this[13], this[14], this[15]].join(' '),
		].join('\n'))
	}

	translate(v: Vec3): Mat4 {
		return this.mul(Mat4.translate(v));
	}

	scale(v: Vec3): Mat4 {
		return this.mul(Mat4.scale(v));
	}

	f32Low() {
		return new Float32Array(this.map(v => v - Math.fround(v)));
	}
}
