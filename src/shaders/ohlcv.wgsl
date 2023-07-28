#include "./camera.wgsl"

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
	@location(0) instanceMinPos: vec3f,
	@location(1) instanceMinPosLow: vec3f,
	@location(2) instanceMaxPos: vec3f,
	@location(3) instanceMaxPosLow: vec3f,
	@location(4) instanceColor: vec3f,
) -> VertexOutput {
	let position = vertex(index, instanceMinPos, instanceMaxPos);
	let positionLow = vertex(index, instanceMinPosLow, instanceMaxPosLow);
	let position64 = dsFun90(position, positionLow);

	return VertexOutput(
		camera.mvp * vec4f(position64, 1.0),
		vec4f(instanceColor, 1.0),
	);
}

@fragment fn frag(in: VertexOutput) -> @location(0) vec4f {
	return vec4f(in.color);
}
