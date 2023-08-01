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

fn vertex(index: u32, minPos: vec3f, maxPos: vec3f) -> vec3f {
	switch (index % 4u) {
		case 0u: { return vec3f(minPos.x, minPos.y, maxPos.z); }
		case 1u: { return vec3f(maxPos.x, minPos.y, minPos.z); }
		case 2u: { return vec3f(maxPos.x, maxPos.y, maxPos.z); }
		case 3u: { return vec3f(minPos.x, maxPos.y, minPos.z); }
		default: { return vec3f(0.0); }
	}
}

fn vertexUV(index: u32) -> vec2f {
	return array(
		vec2f(-1.0, -1.0),
		vec2f(1.0, -1.0),
		vec2f(1.0, 1.0),
		vec2f(-1.0, 1.0)
	)[index % 4u];
}

@vertex fn vert(
	@builtin(vertex_index) index: u32,
	@location(0) minPos: vec3f,
	@location(1) minPosLow: vec3f,
	@location(2) maxPos: vec3f,
	@location(3) maxPosLow: vec3f
) -> VertexOutput {
	let position = vertex(index, minPos, maxPos);
	let positionLow = vertex(index, minPosLow, maxPosLow);
	let position64 = dsFun90(position, positionLow);
	return VertexOutput(
		camera.mvp * vec4f(position64, 1.0),
		position.xy
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
