use './scene.wgsl'::{ view, view32 };
use './basic.vert.wgsl'::{ projected, VertexInput, position64 };
use './fp64.wgsl'::{ vec4_64, vec4_sum64 };

struct LineVertexOutput {
	@builtin(position) position: vec4f,
	@location(0) color: vec4f,
}

@vertex fn main(arg: VertexInput) -> LineVertexOutput {
	let v = position64(arg);
	let c = vec4f(1.0);

	if (arg.vertex % 2 == 0) {
		// Point on surface
		let p = projected(arg, v);
		return LineVertexOutput(p.proj, c);
	} else {
		let n = vec4_64(vec4f(arg.normal, 0.0), vec4f(0.0));
		let p = projected(arg, vec4_sum64(v, n));

		return LineVertexOutput(p.proj, c);
	}
}
