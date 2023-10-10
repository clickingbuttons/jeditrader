struct Axes {
	backgroundColor: vec4f,
	lineColor: vec4f,
	hoverColor: vec4f,
	hover: vec2f,
	lineThickness: f32,
	horizontalLinesLen: f32,
	verticalLinesLen: f32,
}
@group(axes) @binding(0) var<uniform> axes: Axes;
@group(axes) @binding(1) var<storage, read> horizontalLines: array<f32>;
@group(axes) @binding(2) var<storage, read> verticalLines: array<f32>;

@fragment fn main(
	@builtin(position) position: vec4f,
	@location(0) uv: vec2f,
) -> @location(0) vec4f {
	var dudv = vec2(
		length(vec2(dpdx(uv.x), dpdy(uv.x))),
		length(vec2(dpdx(uv.y), dpdy(uv.y)))
	);
	dudv *= axes.lineThickness;

	if (
		(uv.y > -dudv.y + axes.hover.y && uv.y < dudv.y + axes.hover.y) ||
		(uv.x > -dudv.x + axes.hover.x && uv.x < dudv.x + axes.hover.x)
	) {
		return axes.hoverColor;
	}
	for (var i: u32 = 0; i < u32(axes.horizontalLinesLen); i++) {
		let xVal = horizontalLines[i];
		if (uv.y > -dudv.y + xVal && uv.y < dudv.y + xVal) {
			return axes.lineColor;
		}
	}
	for (var i: u32 = 0; i < u32(axes.verticalLinesLen); i++) {
		let yVal = verticalLines[i];
		if (uv.x > -dudv.x + yVal && uv.x < dudv.x + yVal) {
			return axes.lineColor;
		}
	}

	return axes.backgroundColor;
}
