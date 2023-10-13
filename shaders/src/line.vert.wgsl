use './scene.wgsl'::{ view, view32, wireframe };
use './basic.vert.wgsl'::{ projected, VertexInput, getNormal, getColor, position64 };
use './fp64.wgsl'::{ vec4_64, vec4_sum64 };

struct LineVertexOutput {
	@builtin(position) position: vec4f,
	@location(0) color: vec4f,
}

@vertex fn main(arg: VertexInput) -> LineVertexOutput {
	let surfacePos = VertexInput(arg.vertex / 2, arg.instance);
	let v = position64(surfacePos);
	// let c = vec4f(f32(arrayLength(&_03_normals)) / 72 / 3, 0.0, 0.0, 1.0);
	// let c = getColor(arg);
	let c = vec4f(1.0);

	if (arg.vertex % 2 == 0) {
		let p = projected(surfacePos, v);
		return LineVertexOutput(p.proj, c);
	} else {
		let n = vec4_64(vec4f(getNormal(surfacePos), 0.0), vec4f(0.0));
		// let n = vec4_64(vec4f(-1.0, 0.0, 0.0, 0.0), vec4f(0.0));
		let p = projected(surfacePos, vec4_sum64(v, n));

		return LineVertexOutput(p.proj, c);
	}
	// return LineVertexOutput(vec4f(-100), vec4f(0));
}
