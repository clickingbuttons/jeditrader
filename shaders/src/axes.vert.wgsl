// import { toVec4 } from './fp64.wgsl';
// import { projected, VertexInput, position64 } from './basic.vert.wgsl';

struct VertexOutput {
	@builtin(position) position: vec4f,
	@location(0) uv: vec2f,
};

@vertex fn main(arg: VertexInput) -> VertexOutput {
	let p = projected(arg, position64(arg));
	return VertexOutput(p.proj, toVec4(p.eye).xy);
}

