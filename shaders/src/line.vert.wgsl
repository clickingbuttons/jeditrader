use './scene.wgsl'::{ view };
use './fp64.wgsl'::{ fp64, mat4_vec4_mul64, vec4_sub64, vec4_64, toVec4 };

struct Strides {
	instance: u32,
	vertex: u32,
};
@group(line) @binding(0) var<storage, read> strides: Strides;
@group(line) @binding(1) var<storage, read> positions: array<fp64>;
@group(line) @binding(2) var<storage, read> colors: array<vec4f>;

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
	eye: array<fp64, 4>,
	view: vec4f,
	proj: vec4f,
}

fn projected(arg: VertexInput) -> Position {
	var res = Position();

	// Eye takes on values more precise than f32 can handle. Apply before view.
	res.eye = vec4_sub64(res.model2, vec4_64(view.eye, view.eyeLow));
	res.view = view32() * toVec4(res.eye);
	res.proj = view.proj * res.view;

	return res;
}

@export struct VertexOutput {
	@builtin(position) position: vec4f,
	@location(0) color: vec4f,
}

@vertex fn main(arg: VertexInput) -> VertexOutput {
	let p = projected(arg);
	return VertexOutput(p.proj, color(arg), toVec4(p.model2), normal(arg));
}
