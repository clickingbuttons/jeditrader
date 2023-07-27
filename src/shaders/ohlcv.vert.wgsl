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
	@location(1) instancePos: vec3f,
	@location(2) instanceScale: vec3f,
) -> VertexOutput {
	var color: vec4f = vec4f(1.0, 1.0, 1.0, 1.0);
	if (instanceScale.y < 0) { color = vec4f(1.0, 0.0, 0.0, 1.0); }
	else if (instancePos.y > 0) { color = vec4f(0.0, 1.0, 0.0, 1.0); }
	var pos = (position + instancePos) * instanceScale;

	return VertexOutput(
		view_params.view_proj * vec4f(pos, 1.0),
		color
	);
};
