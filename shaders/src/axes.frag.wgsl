struct Axes {
	backgroundColor: u32,
	lineColor: u32,
	hoverColor: u32,
	selectColor: u32,
	hover: vec2f,
	selectStart: vec2f,
	lineThickness: f32,
	horizontalLinesLen: u32,
	verticalLinesLen: u32,
	selecting: u32,
}
@group(axes) @binding(0) var<uniform> axes: Axes;
@group(axes) @binding(1) var<storage, read> horizontalLines: array<f32>;
@group(axes) @binding(2) var<storage, read> verticalLines: array<f32>;

fn getOpaqueColor(uv: vec2f, dudv: vec2f) -> vec4f {
	if (
		(uv.y > -dudv.y + axes.hover.y && uv.y < dudv.y + axes.hover.y) ||
		(uv.x > -dudv.x + axes.hover.x && uv.x < dudv.x + axes.hover.x)
	) {
		return unpack4x8unorm(axes.hoverColor);
	}
	for (var i: u32 = 0; i < axes.horizontalLinesLen; i++) {
		let xVal = horizontalLines[i];
		if (uv.y > -dudv.y + xVal && uv.y < dudv.y + xVal) {
			return unpack4x8unorm(axes.lineColor);
		}
	}
	for (var i: u32 = 0; i < axes.verticalLinesLen; i++) {
		let yVal = verticalLines[i];
		if (uv.x > -dudv.x + yVal && uv.x < dudv.x + yVal) {
			return unpack4x8unorm(axes.lineColor);
		}
	}

	return unpack4x8unorm(axes.backgroundColor);
}

fn getTransparentColor(uv: vec2f, dudv: vec2f) -> vec4f {
	if (bool(axes.selecting)) {
		let minP = min(axes.selectStart, axes.hover);
		let maxP = max(axes.selectStart, axes.hover);

		if (
			uv.x > minP.x && uv.x < maxP.x &&
			uv.y > minP.y && uv.y < maxP.y
		) {
			return unpack4x8unorm(axes.selectColor);
		}
	}

	return vec4f(1);
}

@fragment fn main(
	@builtin(position) position: vec4f,
	@location(0) uv: vec2f,
) -> @location(0) vec4f {
	var dudv = vec2(
		length(vec2(dpdx(uv.x), dpdy(uv.x))),
		length(vec2(dpdx(uv.y), dpdy(uv.y)))
	);
	dudv *= axes.lineThickness;

	return getOpaqueColor(uv, dudv) * getTransparentColor(uv, dudv);
}
