struct Light {
	pos: vec3f,
	color: u32,
}
@group(g_scene) @binding(1) var<uniform> light: Light;

@fragment fn main(
	@builtin(position) position: vec4f,
	@location(0) color: vec4f,
	@location(1) worldPos: vec4f,
	@location(2) normal: vec3f,
) -> @location(0) vec4f {
	let ambient = vec4f(color.xyz * 0.1, 1.0);

	let lightDir = normalize(light.pos - worldPos.xyz);
	let diff = max(dot(normalize(normal), lightDir), 0.0);
	let diffuse = diff * unpack4x8unorm(light.color);

	return (ambient + diffuse) * color;
}
