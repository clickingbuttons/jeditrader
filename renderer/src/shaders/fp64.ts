// Whitepaper: https://andrewthall.org/papers/df64_qf128.pdf
// WGSL port of https://github.com/visgl/luma.gl/blob/291a2fdfb1cfdb15405032b3dcbfbe55133ead61/modules/shadertools/src/modules/math/fp64/fp64-arithmetic.glsl.ts

export function fp64(one: string = '') {
	const oneMul = one ? `* ${one}` : '';
	return `
struct f64 {
	high: f32,
	low: f32,
}

// Divide float number to high and low floats to extend fraction bits
fn split(a: f32) -> f64 {
	let c = ((1 << 12) + 1) * a;
	let a_big = c - a;
	let a_hi = c ${oneMul} - a_big;
	let a_lo = a ${oneMul} - a_hi;
	return f64(a_hi, a_lo);
}

// Divide float number again when high float uses too many fraction bits
fn split2(a: f64) -> f64 {
  var b = split(a.high);
  b.low += a.low;
  return b;
}

// Special sum operation when a > b
fn quickTwoSum(a: f32, b: f32) -> f64 {
	let x = (a + b) ${oneMul};
	let b_virt = (x - a) ${oneMul};
	let y = b - b_virt;
	return f64(x, y);
}

fn twoSum(a: f32, b: f32) -> f64 {
	let x = (a + b);
	let b_virt = (x - a) ${oneMul};
	let a_virt = (x - b_virt) ${oneMul};
	let b_err = b - b_virt;
	let a_err = a - a_virt;
	let y = a_err + b_err;
	return f64(x, y);
}

fn twoSub(a: f32, b: f32) -> f64 {
	let s = (a - b);
	let v = (s ${oneMul} - a) ${oneMul};
	let err = (a - (s - v) ${oneMul}) ${oneMul} - (b + v);
	return f64(s, err);
}

fn twoProd(a: f32, b: f32) -> f64 {
	let x = a * b;
	let a2 = split(a);
	let b2 = split(b);
	let err1 = x - (a2.high * b2.high ${oneMul}) ${oneMul};
	let err2 = err1 - (a2.low * b2.high ${oneMul}) ${oneMul};
	let err3 = err2 - (a2.high * b2.low ${oneMul}) ${oneMul};
	let y = a2.low * b2.low - err3;
	return f64(x, y);
}

fn sum64(a: f64, b: f64) -> f64 {
	var s = twoSum(a.high, b.high);
	var t = twoSum(a.low, b.low);
	s.low += t.high;
	s = quickTwoSum(s.high, s.low);
	s.low += t.low;
	s = quickTwoSum(s.high, s.low);
	return s;
}

fn sub64(a: f64, b: f64) -> f64 {
	var s = twoSub(a.high, b.high);
	var t = twoSub(a.low, b.low);
	s.low += t.high;
	s = quickTwoSum(s.high, s.low);
	s.low += t.low;
	s = quickTwoSum(s.high, s.low);
	return f64(s.high, s.low);
}

fn mul64(a: f64, b: f64) -> f64 {
	var p = twoProd(a.high, b.high);
	p.low += a.high * b.low;
	p.low += a.low * b.high;
	p = quickTwoSum(p.high, p.low);
	return p;
}

fn vec4_dot64(a: array<f64, 4>, b: array<f64, 4>) -> f64 {
	var v = array<f64, 4>();

	v[0] = mul64(a[0], b[0]);
	v[1] = mul64(a[1], b[1]);
	v[2] = mul64(a[2], b[2]);
	v[3] = mul64(a[3], b[3]);

	return sum64(sum64(v[0], v[1]), sum64(v[2], v[3]));
}

fn mat4_vec4_mul64(b: array<f64, 16>, a: array<f64, 4>) -> array<f64, 4> {
	var res = array<f64, 4>();
	var tmp = array<f64, 4>();

	for (var i = 0u; i < 4u; i++) {
		for (var j = 0u; j < 4u; j++) {
			tmp[j] = b[j * 4u + i];
		}
		res[i] = vec4_dot64(a, tmp);
	}

	return res;
}
`;
}
