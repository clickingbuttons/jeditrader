use './fp64.wgsl'::{ toVec4 };
use './basic.vert.wgsl'::{ projected, VertexInput };

@export struct VertexOutput {
	@builtin(position) position: vec4f,
	@location(0) uv: vec2f,
};

@vertex fn main(arg: VertexInput) -> VertexOutput {
	let pos = projected(arg);
	return VertexOutput(pos.proj, toVec4(pos.eye).xy);
}

