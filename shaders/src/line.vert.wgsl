// import { fp64, vec4_sub64, vec4_64, toVec4 } from './fp64.wgsl';
// import { view, view32, wireframe } from './scene.wgsl';

@group(line) @binding(0) var<storage> positions: array<fp64>;
@group(line) @binding(1) var<storage> colors: array<u32>;

struct VertexInput {
	@builtin(vertex_index) vertex: u32,
}
struct VertexOutput {
	@builtin(position) position: vec4f,
	@location(0) color: vec4f,
}

fn position64(arg: VertexInput) -> array<fp64, 4> {
	let index = arg.vertex * 3u;

	return array<fp64, 4>(
		positions[index + 0],
		positions[index + 1],
		positions[index + 2],
		fp64(1.0, 0.0)
	);
}

struct Position {
	eye: array<fp64, 4>,
	view: vec4f,
	proj: vec4f,
}

fn projected(pos: array<fp64, 4>) -> Position {
	var res = Position();

	// Eye takes on values more precise than f32 can handle. Apply before view.
	res.eye = vec4_sub64(pos, vec4_64(view.eye, view.eyeLow));
	res.view = view32() * toVec4(res.eye);
	res.proj = view.proj * res.view;

	return res;
}

@vertex fn main(arg: VertexInput) -> VertexOutput {
	let p = projected(position64(arg));
	return VertexOutput(p.proj, unpack4x8unorm(colors[arg.vertex]));
}
