struct VertexOutput {
	@builtin(position) position: vec4f,
	@location(0) color: vec4f,
};

struct ViewParams {
	view_proj: mat4x4f,
};
@group(0) @binding(0)
var<uniform> view_params: ViewParams;

@vertex fn main(
	@location(0) position: vec3f,
	@location(1) instancePos: vec4f,
) -> VertexOutput {
	var out: VertexOutput;

	if (instancePos.w == -1) { out.color = vec4f(1.0, 0.0, 0.0, 1.0); }
	else if (instancePos.w == 0) { out.color = vec4f(1.0, 1.0, 1.0, 1.0); }
	else if (instancePos.w == 1) { out.color = vec4f(0.0, 1.0, 0.0, 1.0); }
	else { out.color = vec4f(0.0, 0.0, 0.0, 1.0); }

	var pos = position + instancePos.xyz;
	out.position = view_params.view_proj * vec4f(pos, 1.0);

	return out;
};
