@global @export struct View {
	view: mat4x4f,
	proj: mat4x4f,
	eye: vec4f,
	eyeLow: vec4f,
	one: f32,
};
@global @export @group(g_scene) @binding(0) var<uniform> view: View;
@global @export @group(g_scene) @binding(1) var<uniform> lightPos: vec3f;

@export fn view32() -> mat4x4f {
	var res = mat4x4f(view.view);
	res[3][0] = 0.0;
	res[3][1] = 0.0;
	res[3][2] = 0.0;

	return res;
}

