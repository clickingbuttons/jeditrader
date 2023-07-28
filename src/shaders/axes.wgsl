#include "./camera.wgsl"

struct Axes {
	colorThin: vec4f,
	colorThick: vec4f,
	minCellSize: f32,
	minPixelsBetweenCells: f32,
}

@group(1) @binding(0) var<uniform> axes: Axes;

struct VertexOutput {
	@builtin(position) position: vec4f,
	@location(0) uv: vec2f,
	@location(1) uvLow: vec2f,
}

@vertex fn vert(
	@location(0) position: vec3f,
	@location(1) positionLow: vec3f
) -> VertexOutput {
	let position64 = dsFun90(position, positionLow);
	return VertexOutput(
		camera.mvp * vec4f(position64, 1.0),
		position.xy,
		positionLow.xy,
	);
}

fn log10(x: f32) -> f32 { return log(x) / log(10.0); }
fn satf(x: f32) -> f32 { return clamp(x, 0.0, 1.0); }
fn satv(x: vec2f) -> vec2f { return clamp(x, vec2f(0.0), vec2f(1.0)); }
fn max2(v: vec2f) -> f32 { return max(v.x, v.y); }

@fragment fn frag(in: VertexOutput) -> @location(0) vec4f {
	let uv = abs(in.uv);
	let uvLow = abs(in.uvLow);
	var dudv = vec2(
		length(vec2(dpdx(uv.x), dpdy(uv.x))) + length(vec2(dpdx(uvLow.x), dpdy(uvLow.x))),
		length(vec2(dpdx(uv.y), dpdy(uv.y))) + length(vec2(dpdx(uvLow.y), dpdy(uvLow.y)))
	);

	let lodLevel = max(
		0.0,
		log10(length(dudv) * axes.minPixelsBetweenCells / axes.minCellSize) + 1.0
	);
	let lodFade = fract(lodLevel);

	// cell sizes for lod0, lod1 and lod2
	let lod0 = axes.minCellSize * pow(10.0, floor(lodLevel));
	let lod1 = lod0 * 10.0;
	let lod2 = lod1 * 10.0;

	// each anti-aliased line covers up to 4 pixels
	dudv *= 2.0;

	// calculate absolute distances to cell line centers for each lod and pick max X/Y to get coverage alpha value
	let lod0a = max2( vec2(1.0) - abs(satv(uv % lod0 / dudv) * 2.0 - vec2(1.0)) );
	let lod1a = max2( vec2(1.0) - abs(satv(uv % lod1 / dudv) * 2.0 - vec2(1.0)) );
	let lod2a = max2( vec2(1.0) - abs(satv(uv % lod2 / dudv) * 2.0 - vec2(1.0)) );

	// blend between falloff colors to handle LOD transition
	var res = axes.colorThin;
	if (lod2a > 0.0) { res = axes.colorThick; }
	else if (lod1a > 0.0) { res = mix(axes.colorThick, axes.colorThin, lodFade); }

	// Color axes differently
	if (uv.x > -dudv.x && uv.x < dudv.x) { res.y = 0.4; }
	if (uv.y > -dudv.y && uv.y < dudv.y) { res.x = 0.4; }

	return axes.colorThin;
	return res;
}
