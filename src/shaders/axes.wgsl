#include "./camera.wgsl"

struct Axes {
	backgroundColor: vec4f,
	lineColor: vec4f,
	lineThickness: f32,
}

@group(1) @binding(0) var<uniform> axes: Axes;
@group(1) @binding(1) var<storage> horizontalLines: array<f32>;
@group(1) @binding(2) var<storage> verticalLines: array<f32>;

struct VertexOutput {
	@builtin(position) position: vec4f,
	@location(0) uv: vec2f,
}

@vertex fn vert(
	@location(0) pos: vec2f,
	@location(1) posLow: vec2f,
) -> VertexOutput {
	let position64 = dsFun90(vec3f(pos, 0.0), vec3f(posLow, 0.0));
	return VertexOutput(
		camera.mvp * vec4f(position64, 1.0),
		pos,
	);
}

@fragment fn frag(in: VertexOutput) -> @location(0) vec4f {
	let uv = in.uv;
	var dudv = vec2(
		length(vec2(dpdx(uv.x), dpdy(uv.x))),
		length(vec2(dpdx(uv.y), dpdy(uv.y)))
	);
	dudv *= axes.lineThickness;

	for (var i: u32 = 0; i < arrayLength(&horizontalLines); i++) {
		let xVal = horizontalLines[i];
		if (uv.y > -dudv.y + xVal && uv.y < dudv.y + xVal) {
			return axes.lineColor;
		}
	}
	for (var i: u32 = 0; i < arrayLength(&verticalLines); i++) {
		let yVal = verticalLines[i];
		if (uv.x > -dudv.x + yVal && uv.x < dudv.x + yVal) {
			return axes.lineColor;
		}
	}

	return axes.backgroundColor;
}
