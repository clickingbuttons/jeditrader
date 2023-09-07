import { Camera } from './camera.js';
import { Mesh, ShaderBinding } from './mesh.js';
import { Vec3, clamp } from '@jeditrader/linalg';
import { createBuffer } from './util.js';
import { Range } from './lod.js';

const wgslStruct = `struct Axes {
	backgroundColor: vec4f,
	lineColor: vec4f,
	lineThickness: f32,
}`;
const vertCode = `
	let p = pos(arg);
	return VertexOutput(chart.viewProj * p, p.xy + chart.eye.xy + chart.eyeLow.xy);
`;
const fragCode = `
	let uv = arg.uv;
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
`;

// Unfortunately this is needed to prevent jitter when the camera is at z < 1000
//  8┌─────────┐9
//   │4┌─────┐5│
//   │ │0┌─┐1│ │
//   │ │3└─┘2│ │
//   │7└─────┘6│
// 11└─────────┘10
const nVertices = 12;
// cw vs ccw doesn't matter because we set cullMode: 'none'
const indices = [
	0, 1, 2,
	2, 0, 3,
	4, 0, 5,
	0, 5, 1,
	5, 1, 6,
	2, 6, 1,
	2, 6, 7,
	7, 3, 2,
	3, 7, 0,
	0, 4, 7,
	8, 4, 9,
	4, 5, 9,
	9, 5, 6,
	9, 10, 6,
	6, 10, 7,
	7, 10, 11,
	7, 11, 4,
	11, 8, 4,
];

export class Axes extends Mesh {
	static defaultRange = {
		min: new Vec3([-5000, -5000, -5000]),
		max: new Vec3([5000, 5000, 5000])
	};
	range: Range<Vec3> = Axes.defaultRange;

	uniform: GPUBuffer;
	horizontalLines: GPUBuffer;
	verticalLines: GPUBuffer;

	getGeometry(camPos: Vec3) {
		const range = this.range;
		const cameraZ = camPos.z;
		const lod0 = cameraZ / 16;
		const lod1 = cameraZ;

		const clampX = (x: number) => clamp(x, range.min.x, range.max.x);
		const clampY = (y: number) => clamp(y, range.min.y, range.max.y);

		const positions: number[] = [
			clampX(camPos.x - lod0), clampY(camPos.y + lod0), 0,
			clampX(camPos.x + lod0), clampY(camPos.y + lod0), 0,
			clampX(camPos.x + lod0), clampY(camPos.y - lod0), 0,
			clampX(camPos.x - lod0), clampY(camPos.y - lod0), 0,

			clampX(camPos.x - lod1), clampY(camPos.y + lod1), 0,
			clampX(camPos.x + lod1), clampY(camPos.y + lod1), 0,
			clampX(camPos.x + lod1), clampY(camPos.y - lod1), 0,
			clampX(camPos.x - lod1), clampY(camPos.y - lod1), 0,

			range.min.x, range.max.y, 0,
			range.max.x, range.max.y, 0,
			range.max.x, range.min.y, 0,
			range.min.x, range.min.y, 0,
		];

		return positions;
	}

	constructor(device: GPUDevice, chart: GPUBuffer) {
		const uniform = createBuffer({
			device,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
			data: new Float32Array([
				0.2, 0.2, 0.2, 1, // backgroundColor
				0, 0, 0, 1, // lineColor
				2, // lineThickness
			])
		});
		const horizontalLines = createBuffer({
			device,
			data: new Float32Array(32)
		});
		const verticalLines = createBuffer({
			device,
			data: new Float32Array(32)
		});

		super(
			device,
			chart,
			new Array(nVertices * 3).fill(0),
			indices,
			{
				bindings: [
					new ShaderBinding({
						name: 'axes',
						type: 'uniform',
						buffer: uniform,
						visibility: GPUShaderStage.FRAGMENT,
						wgslStruct,
						wgslType: 'Axes',
					}),
					new ShaderBinding({
						name: 'horizontalLines',
						buffer: horizontalLines,
						visibility: GPUShaderStage.FRAGMENT,
					}),
					new ShaderBinding({
						name: 'verticalLines',
						buffer: verticalLines,
						visibility: GPUShaderStage.FRAGMENT,
					}),
				],
				depthWriteEnabled: false,
				cullMode: 'none',
				vertOutputFields: [ 'uv: vec2f' ],
				vertCode,
				fragCode,
			}
		);
		this.uniform = uniform;
		this.horizontalLines = horizontalLines;
		this.verticalLines = verticalLines;
	}

	setRange(range: Range<Vec3>) {
		this.range = range;
	}

	update(camPos: Vec3) {
		this.updatePositions(this.getGeometry(camPos));
	}
}
