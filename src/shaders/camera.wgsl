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

