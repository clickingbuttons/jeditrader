struct View {
	view: mat4x4f,
	proj: mat4x4f,
	eye: vec4f,
	eyeLow: vec4f,
	one: f32,
	nPointLights: f32,
};
struct PointLight {
	pos: vec3f,
	color: u32,
};
@group(g_scene) @binding(0) var<uniform> view: View;
@group(g_scene) @binding(1) var<storage> lights: array<PointLight>;

fn view32() -> mat4x4f {
	var res = mat4x4f(view.view);
	res[3][0] = 0.0;
	res[3][1] = 0.0;
	res[3][2] = 0.0;

	return res;
}

override wireframe: bool = false;
