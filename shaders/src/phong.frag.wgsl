struct Phong {
	ambient: vec4f,
};
struct Light {
	pos: vec3f,
	color: u32,
}
@group(g_scene) @binding(1) var<uniform> light: Light;
@group(phong) @binding(0) var<uniform> phong: Phong;

@fragment fn main(
	@builtin(position) position: vec4f,
	@location(0) color: vec4f,
	@location(1) worldPos: vec4f,
	@location(2) normal: vec3f,
) -> @location(0) vec4f {
	let ambient = phong.ambient.rgb * phong.ambient.a;

	let lightDir = normalize(light.pos - worldPos.xyz);
	let diff = max(dot(normalize(normal), lightDir), 0.0);
	let diffuse = diff * unpack4x8unorm(light.color).xyz;

	return vec4f((ambient + diffuse) * color.xyz, 1.0);
}
