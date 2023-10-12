use './scene.wgsl'::{ view };
use './fp64.wgsl'::{ fp64, mat4_vec4_mul64, vec4_sub64, vec4_64, toVec4 };

@global override wireframe: bool = false;


struct Strides {
	instance: u32,
	vertex: u32,
};
@group(mesh) @binding(0) var<storage, read> strides: Strides;
@group(mesh) @binding(1) var<storage, read> positions: array<fp64>;
@group(mesh) @binding(2) var<storage, read> indices: array<u32>;

@group(mesh) @binding(3) var<storage, read> inModel: array<fp64, 16>;
@group(mesh) @binding(4) var<storage, read> models: array<array<fp64, 16>>;
@group(mesh) @binding(5) var<storage, read> colors: array<vec4f>;
@group(mesh) @binding(6) var<storage, read> normals: array<vec3f>;

@export struct VertexInput {
	@builtin(instance_index) instance: u32,
	@builtin(vertex_index) vertex: u32,
}
@export struct VertexOutput {
	@builtin(position) position: vec4f,
	@location(0) color: vec4f,
	@location(1) worldPos: vec4f,
	@location(2) normal: vec3f,
}

fn view32() -> mat4x4f {
	let NO_SHAKE = VertexInput();
	let NO_SHAKE2 = VertexOutput();
	var res = mat4x4f(view.view);
	res[3][0] = 0.0;
	res[3][1] = 0.0;
	res[3][2] = 0.0;

	return res;
}

fn model64(arg: VertexInput) -> array<fp64, 16> {
	var index = 0u;
	if (arg.instance < arrayLength(&models)) {
		index = arg.instance;
	}

	return models[index];
}

fn color(arg: VertexInput) -> vec4f {
	var index = 0u;
	if (arg.instance < arrayLength(&colors)) {
		index = arg.instance;
	}

	return colors[index];
}

fn normal(arg: VertexInput) -> vec3f {
	var index = 0u;
	if (arg.vertex < arrayLength(&normals)) {
		index = arg.vertex;
	}

	return normals[index];
}

fn vertIndex(arg: VertexInput) -> u32 {
	if (wireframe) {
		let triangleIndex = arg.vertex / 6u;
		let localVertexIndex = arg.vertex % 6u;

		let localToElement = array<u32, 6>(0u, 1u, 1u, 2u, 2u, 0u);
		let vertIndexIndex = 3u * triangleIndex + localToElement[localVertexIndex];

		return indices[vertIndexIndex];
	}

	return indices[arg.vertex];
}

fn position64(arg: VertexInput) -> array<fp64, 4> {
	let vertIndex = vertIndex(arg);
	let index = arg.instance * strides.instance + vertIndex * strides.vertex;

	var res = array<fp64, 4>(
		fp64(0.0, 0.0),
		fp64(0.0, 0.0),
		fp64(0.0, 0.0),
		fp64(1.0, 0.0)
	);
	for (var i: u32 = 0; i < min(3u, strides.vertex); i += 1) {
		res[i] = positions[index + i];
	}

	return res;
}

struct Position {
	model: array<fp64, 4>,
	model2: array<fp64, 4>,
	eye: array<fp64, 4>,
	view: vec4f,
	proj: vec4f,
}

@export fn projected(arg: VertexInput) -> Position {
	var res = Position();

	res.model = mat4_vec4_mul64(model64(arg), position64(arg));
	res.model2 = mat4_vec4_mul64(inModel, res.model);
	// Eye takes on values more precise than f32 can handle. Apply before view.
	res.eye = vec4_sub64(res.model2, vec4_64(view.eye, view.eyeLow));
	res.view = view32() * toVec4(res.eye);
	res.proj = view.proj * res.view;

	return res;
}

@vertex fn main(arg: VertexInput) -> VertexOutput {
	let p = projected(arg);
	return VertexOutput(p.proj, color(arg), toVec4(p.model2), normal(arg));
}
