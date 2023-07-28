@group(0) @binding(0) var<uniform> viewProj: mat4x4f;

struct VertexOutput {
	@builtin(position) position: vec4f,
	@location(0) color: vec4f,
}

fn vertex(index: u32, minPos: vec3f, maxPos: vec3f) -> vec3f {
	switch (index % 8) {
		case 0: { return vec3f(maxPos.x, maxPos.y, minPos.z); }
		case 1: { return vec3f(minPos.x, maxPos.y, minPos.z); }
		case 2: { return vec3f(maxPos.x, minPos.y, minPos.z); }
		case 3: { return vec3f(minPos.x, minPos.y, minPos.z); }
		case 4: { return vec3f(maxPos.x, maxPos.y, maxPos.z); }
		case 5: { return vec3f(minPos.x, maxPos.y, maxPos.z); }
		case 6: { return vec3f(minPos.x, minPos.y, maxPos.z); }
		case 7: { return vec3f(maxPos.x, minPos.y, maxPos.z); }
		default: { return vec3f(0); }
	}
}

@vertex fn vert(
	@builtin(vertex_index) index: u32,
	@location(0) instanceMinPos: vec3f,
	@location(1) instanceMaxPos: vec3f,
	@location(2) instanceColor: vec3f,
) -> VertexOutput {
	let position = vertex(index, instanceMinPos, instanceMaxPos);

	return VertexOutput(
		viewProj * vec4f(position, 1.0),
		vec4f(instanceColor, 1.0),
	);
}

@fragment fn frag(in: VertexOutput) -> @location(0) vec4f {
	return vec4f(in.color);
}
