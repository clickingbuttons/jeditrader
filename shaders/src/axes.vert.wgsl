use './fp64.wgsl'::{ toVec4 };
use './basic.vert.wgsl'::{ projected, VertexInput, position64 };

@export struct VertexOutput {
	@builtin(position) position: vec4f,
	@location(0) uv: vec2f,
};

@vertex fn main(arg: VertexInput) -> VertexOutput {
	let p = projected(arg, position64(arg));
	return VertexOutput(p.proj, toVec4(p.eye).xy);
}

