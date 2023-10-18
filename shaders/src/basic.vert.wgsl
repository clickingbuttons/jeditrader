use './scene.wgsl'::{ view, view32, wireframe };
use './fp64.wgsl'::{ fp64, mat4_vec4_mul64, vec4_sub64, vec4_64, toVec4 };

struct Strides {
	instance: u32,
};
@group(mesh) @binding(0) var<uniform> strides: Strides;
@group(mesh) @binding(1) var<storage, read> indices: array<u32>;
@group(mesh) @binding(2) var<storage, read> positions: array<fp64>;

@group(mesh) @binding(3) var<storage, read> inModel: array<fp64, 16>;
@group(mesh) @binding(4) var<storage, read> models: array<array<fp64, 16>>;
@group(mesh) @binding(5) var<storage, read> colors: array<u32>;
@group(mesh) @binding(6) var<storage, read> instanceColors: array<u32>;
@group(mesh) @binding(7) var<storage, read> normals: array<f32>;

@export struct VertexInput {
	@builtin(vertex_index) vertex: u32,
	@builtin(instance_index) instance: u32,
}
@export struct VertexOutput {
	@builtin(position) position: vec4f,
	@location(0) color: vec4f,
	@location(1) worldPos: vec4f,
	@location(2) normal: vec3f,
}

@export fn model64(arg: VertexInput) -> array<fp64, 16> {
	let NO_SHAKE = VertexInput();
	let NO_SHAKE2 = VertexOutput();
	var index = 0u;
	if (arg.instance < arrayLength(&models)) {
		index = arg.instance;
	}

	return models[index];
}

fn vertIndex(arg: VertexInput, useWireframe: bool) -> u32 {
	if (useWireframe) {
		let triangleIndex = arg.vertex / 6u;
		let localVertexIndex = arg.vertex % 6u;

		let localToElement = array<u32, 6>(0u, 1u, 1u, 2u, 2u, 0u);
		let vertIndexIndex = 3u * triangleIndex + localToElement[localVertexIndex];

		return indices[vertIndexIndex];
	}

	return indices[arg.vertex];
}

@export fn getColor(arg: VertexInput) -> vec4f {
	let index = vertIndex(arg, wireframe);
	let c1 = unpack4x8unorm(colors[index]);
	let c2 = unpack4x8unorm(instanceColors[arg.instance]);

	return c1 * c2;
}

@export fn getNormal(arg: VertexInput) -> vec3f {
	var index = vertIndex(arg, false);

	return vec3f(
		normals[index * 3 + 0],
		normals[index * 3 + 1],
		normals[index * 3 + 2]
	);
}

@export fn position64(arg: VertexInput) -> array<fp64, 4> {
	let index = arg.instance * strides.instance + vertIndex(arg, wireframe) * 3u;

	return array<fp64, 4>(
		positions[index + 0],
		positions[index + 1],
		positions[index + 2],
		fp64(1.0, 0.0)
	);
}

struct Position {
	model: array<fp64, 4>,
	model2: array<fp64, 4>,
	eye: array<fp64, 4>,
	view: vec4f,
	proj: vec4f,
}

@export fn projected(arg: VertexInput, pos: array<fp64, 4>) -> Position {
	var res = Position();

	res.model = mat4_vec4_mul64(model64(arg), pos);
	res.model2 = mat4_vec4_mul64(inModel, res.model);
	// Eye takes on values more precise than f32 can handle. Apply before view.
	res.eye = vec4_sub64(res.model2, vec4_64(view.eye, view.eyeLow));
	res.view = view32() * toVec4(res.eye);
	res.proj = view.proj * res.view;

	return res;
}

@vertex fn main(arg: VertexInput) -> VertexOutput {
	let p = projected(arg, position64(arg));
	return VertexOutput(p.proj, getColor(arg), toVec4(p.model2), getNormal(arg));
}
