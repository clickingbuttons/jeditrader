// import { view, view32 } from './scene.wgsl';
// import { projected, VertexInput, position64, getNormal, getColor, model64 } from './basic.vert.wgsl';
// import { vec4_64, vec4_sum64, mul64, vec4_div64, fp64 } from './fp64.wgsl';

struct LineVertexOutput {
	@builtin(position) position: vec4f,
	@location(0) color: vec4f,
}

@vertex fn main(arg2: VertexInput) -> LineVertexOutput {
	let arg = VertexInput(arg2.vertex / 2, arg2.instance);
	let v = position64(arg);
	let c = getColor(arg);

	if (arg2.vertex % 2 == 0) {
		// Point on surface
		let p = projected(arg, v);
		return LineVertexOutput(p.proj, c);
	} else {
		let n = vec4_64(vec4f(getNormal(arg), 0), vec4f(0));
		let p = projected(arg, vec4_sum64(v, n));

		return LineVertexOutput(p.proj, c);
	}
}
