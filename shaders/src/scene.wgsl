@global @export struct View {
	view: mat4x4f,
	proj: mat4x4f,
	eye: vec4f,
	eyeLow: vec4f,
};
@global @export @group(g_scene) @binding(0) var<uniform> view: View;
@global @export @group(g_scene) @binding(1) var<uniform> lightPos: vec3f;
