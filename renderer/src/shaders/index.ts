const camera = `
struct Camera {
	mvp: mat4x4f,
	eye: vec3f,
	eyeLow: vec3f,
}

@group(0) @binding(0) var<uniform> camera: Camera;

// https://prideout.net/emulating-double-precision
fn dsFun90(position: vec3f, positionLow: vec3f) -> vec3f {
	let t1 = positionLow - camera.eyeLow;
	let e = t1 - positionLow;
	let t2 = ((-camera.eyeLow - e) + (positionLow - (t1 - e))) + position - camera.eye;
	let high_delta = t1 + t2;
	let low_delta = t2 - (high_delta - t1);
	return high_delta + low_delta;
}
`;

export const axes = `${camera}
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
`;

export const ohlcv = `${camera}
struct VertexOutput {
	@builtin(position) position: vec4f,
	@location(0) color: vec4f,
}

fn vertex(index: u32, minPos: vec3f, maxPos: vec3f) -> vec3f {
	switch (index % 8u) {
		case 0u: { return vec3f(maxPos.x, maxPos.y, minPos.z); }
		case 1u: { return vec3f(minPos.x, maxPos.y, minPos.z); }
		case 2u: { return vec3f(maxPos.x, minPos.y, minPos.z); }
		case 3u: { return vec3f(minPos.x, minPos.y, minPos.z); }
		case 4u: { return vec3f(maxPos.x, maxPos.y, maxPos.z); }
		case 5u: { return vec3f(minPos.x, maxPos.y, maxPos.z); }
		case 6u: { return vec3f(minPos.x, minPos.y, maxPos.z); }
		case 7u: { return vec3f(maxPos.x, minPos.y, maxPos.z); }
		default: { return vec3f(0.0); }
	}
}

@vertex fn vert(
	@builtin(vertex_index) index: u32,
	@location(0) minPos: vec3f,
	@location(1) minPosLow: vec3f,
	@location(2) maxPos: vec3f,
	@location(3) maxPosLow: vec3f,
	@location(4) color: vec3f,
) -> VertexOutput {
	let position = vertex(index, minPos, maxPos);
	let positionLow = vertex(index, minPosLow, maxPosLow);
	let position64 = dsFun90(position, positionLow);

	return VertexOutput(
		camera.mvp * vec4f(position64, 1.0),
		vec4f(color, 1.0),
	);
}

@fragment fn frag(in: VertexOutput) -> @location(0) vec4f {
	return vec4f(in.color);
}
`;
