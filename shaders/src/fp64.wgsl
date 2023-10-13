// Whitepaper: https://andrewthall.org/papers/dfp64_qf128.pdf
// WGSL port of https://github.com/visgl/luma.gl/blob/291a2fdfb1cfdb15405032b3dcbfbe55133ead61/modules/shadertools/src/modules/math/fp64/fp64-arithmetic.glsl.ts

@global override one: f32 = 1.0;

@export struct fp64 {
	high: f32,
	low: f32,
}

// Divide float number to high and low floats to extend fraction bits
fn split64(a: f32) -> fp64 {
	let c = (f32(1u << 12u) + 1.0) * a;
	let a_big = c - a;
	let a_hi = c * one - a_big;
	let a_lo = a * one - a_hi;
	return fp64(a_hi, a_lo);
}

// Special sum operation when a > b
fn quickTwoSum(a: f32, b: f32) -> fp64 {
	let x = (a + b) * one;
	let b_virt = (x - a) * one;
	let y = b - b_virt;
	return fp64(x, y);
}

fn twoSum(a: f32, b: f32) -> fp64 {
	let x = (a + b);
	let b_virt = (x - a) * one;
	let a_virt = (x - b_virt) * one;
	let b_err = b - b_virt;
	let a_err = a - a_virt;
	let y = a_err + b_err;
	return fp64(x, y);
}

fn twoSub(a: f32, b: f32) -> fp64 {
	let s = (a - b);
	let v = (s * one - a) * one;
	let err = (a - (s - v) * one) * one - (b + v);
	return fp64(s, err);
}

fn twoProd(a: f32, b: f32) -> fp64 {
	let x = a * b;
	let a2 = split64(a);
	let b2 = split64(b);
	let err1 = x - (a2.high * b2.high * one) * one;
	let err2 = err1 - (a2.low * b2.high * one) * one;
	let err3 = err2 - (a2.high * b2.low * one) * one;
	let y = a2.low * b2.low - err3;
	return fp64(x, y);
}

@export fn sum64(a: fp64, b: fp64) -> fp64 {
	var s = twoSum(a.high, b.high);
	var t = twoSum(a.low, b.low);
	s.low += t.high;
	s = quickTwoSum(s.high, s.low);
	s.low += t.low;
	s = quickTwoSum(s.high, s.low);
	return s;
}

@export fn sub64(a: fp64, b: fp64) -> fp64 {
	var s = twoSub(a.high, b.high);
	var t = twoSub(a.low, b.low);
	s.low += t.high;
	s = quickTwoSum(s.high, s.low);
	s.low += t.low;
	s = quickTwoSum(s.high, s.low);
	return fp64(s.high, s.low);
}

@export fn mul64(a: fp64, b: fp64) -> fp64 {
	var p = twoProd(a.high, b.high);
	p.low += a.high * b.low;
	p.low += a.low * b.high;
	p = quickTwoSum(p.high, p.low);
	return p;
}

@export fn vec4_sum64(a: array<fp64, 4>, b: array<fp64, 4>) -> array<fp64, 4> {
	return array<fp64, 4>(
		sum64(a[0], b[0]),
		sum64(a[1], b[1]),
		sum64(a[2], b[2]),
		sum64(a[3], b[3]),
	);
}

@export fn vec4_sub64(a: array<fp64, 4>, b: array<fp64, 4>) -> array<fp64, 4> {
	return array<fp64, 4>(
		sub64(a[0], b[0]),
		sub64(a[1], b[1]),
		sub64(a[2], b[2]),
		sub64(a[3], b[3]),
	);
}

@export fn vec4_dot64(a: array<fp64, 4>, b: array<fp64, 4>) -> fp64 {
	var v = array<fp64, 4>();

	v[0] = mul64(a[0], b[0]);
	v[1] = mul64(a[1], b[1]);
	v[2] = mul64(a[2], b[2]);
	v[3] = mul64(a[3], b[3]);

	return sum64(sum64(v[0], v[1]), sum64(v[2], v[3]));
}

@export fn mat4_vec4_mul64(b: array<fp64, 16>, a: array<fp64, 4>) -> array<fp64, 4> {
	var res = array<fp64, 4>();
	var tmp = array<fp64, 4>();

	for (var i = 0u; i < 4u; i++) {
		for (var j = 0u; j < 4u; j++) {
			tmp[j] = b[j * 4u + i];
		}
		res[i] = vec4_dot64(a, tmp);
	}

	return res;
}

@export fn toVec4(v: array<fp64, 4>) -> vec4f {
	return vec4f(
		v[0].high + v[0].low,
		v[1].high + v[1].low,
		v[2].high + v[2].low,
		v[3].high + v[3].low,
	);
}

@export fn mat64(high: mat4x4f, low: mat4x4f) -> array<fp64, 16> {
	return array<fp64, 16>(
		fp64(high[0][0], low[0][0]),
		fp64(high[0][1], low[0][1]),
		fp64(high[0][2], low[0][2]),
		fp64(high[0][3], low[0][3]),

		fp64(high[1][0], low[1][0]),
		fp64(high[1][1], low[1][1]),
		fp64(high[1][2], low[1][2]),
		fp64(high[1][3], low[1][3]),

		fp64(high[2][0], low[2][0]),
		fp64(high[2][1], low[2][1]),
		fp64(high[2][2], low[2][2]),
		fp64(high[2][3], low[2][3]),

		fp64(high[3][0], low[3][0]),
		fp64(high[3][1], low[3][1]),
		fp64(high[3][2], low[3][2]),
		fp64(high[3][3], low[3][3]),
	);
}

@export fn vec4_64(high: vec4f, low: vec4f) -> array<fp64, 4> {
	return array<fp64, 4>(
		fp64(high[0], low[0]),
		fp64(high[1], low[1]),
		fp64(high[2], low[2]),
		fp64(high[3], low[3]),
	);
}
