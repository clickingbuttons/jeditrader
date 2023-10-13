use './scene.wgsl'::{ view, view32 };
use './fp64.wgsl'::{ fp64, mat4_vec4_mul64, vec4_sub64, vec4_64, toVec4 };

@group(mesh) @binding(0) var<storage, read> inModel: array<fp64, 16>;
@group(mesh) @binding(1) var<storage, read> models: array<array<fp64, 16>>;

@export @global struct VertexInput {
	@builtin(vertex_index) vertex: u32,
	@builtin(instance_index) instance: u32,
	@location(0) pos: vec3f,
	@location(1) posLow: vec3f,
	@location(2) normal: vec3f,
	@location(3) @instance color: vec4f,
}
@export @global struct VertexOutput {
	@builtin(position) position: vec4f,
	@location(0) color: vec4f,
	@location(1) worldPos: vec4f,
	@location(2) normal: vec3f,
}

fn model64(arg: VertexInput) -> array<fp64, 16> {
	var index = 0u;
	if (arg.instance < arrayLength(&models)) {
		index = arg.instance;
	}

	return models[index];
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

@export fn position64(arg: VertexInput) -> array<fp64, 4> {
	return vec4_64(vec4f(arg.pos, 1.0), vec4f(arg.posLow, 1.0));
}

@vertex fn main(arg: VertexInput) -> VertexOutput {
	let NO_SHAKE = VertexInput();
	let p = projected(arg, position64(arg));
	return VertexOutput(p.proj, arg.color, toVec4(p.model2), arg.normal);
}
