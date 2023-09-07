import { Mesh, ShaderBinding } from './mesh.js';
import { Vec3 } from '@jeditrader/linalg';
import { createBuffer } from './util.js';
import { Range } from './lod.js';
import { getNext } from '@jeditrader/providers';

const wgslStruct = `struct Axes {
	backgroundColor: vec4f,
	lineColor: vec4f,
	lineThickness: f32,
	horizontalLinesLen: u32,
	verticalLinesLen: u32,
}`;
const vertCode = `
	let p = pos(arg);
	return VertexOutput(chart.viewProj * p.camRelative, p.camRelative.xy);
`;
const fragCode = `
	let uv = arg.uv;
	var dudv = vec2(
		length(vec2(dpdx(uv.x), dpdy(uv.x))),
		length(vec2(dpdx(uv.y), dpdy(uv.y)))
	);
	dudv *= axes.lineThickness;

	for (var i: u32 = 0; i < axes.horizontalLinesLen; i++) {
		let xVal = horizontalLines[i];
		if (uv.y > -dudv.y + xVal && uv.y < dudv.y + xVal) {
			return axes.lineColor;
		}
	}
	for (var i: u32 = 0; i < axes.verticalLinesLen; i++) {
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
	scale = new Vec3([1, 1e9, 1]);

	uniform: GPUBuffer;
	horizontalLines: GPUBuffer;
	verticalLines: GPUBuffer;

	getGeometry(camPos2: Vec3) {
		const camPos = camPos2.div(this.scale);
		const range = this.range;
		const cameraZ = camPos.z;
		const lod0 = cameraZ / 16;
		const lod1 = cameraZ;

		const points = [
			new Vec3([camPos.x - lod0 / this.scale.x, camPos.y + lod0 / this.scale.y, 0]),
			new Vec3([camPos.x + lod0 / this.scale.x, camPos.y + lod0 / this.scale.y, 0]),
			new Vec3([camPos.x + lod0 / this.scale.x, camPos.y - lod0 / this.scale.y, 0]),
			new Vec3([camPos.x - lod0 / this.scale.x, camPos.y - lod0 / this.scale.y, 0]),

			new Vec3([camPos.x - lod1 / this.scale.x, camPos.y + lod1 / this.scale.y, 0]),
			new Vec3([camPos.x + lod1 / this.scale.x, camPos.y + lod1 / this.scale.y, 0]),
			new Vec3([camPos.x + lod1 / this.scale.x, camPos.y - lod1 / this.scale.y, 0]),
			new Vec3([camPos.x - lod1 / this.scale.x, camPos.y - lod1 / this.scale.y, 0]),
		];

		return points
			.map(p => p.clamp(range.min, range.max))
			.concat([
				new Vec3([range.min.x, range.max.y, 0]),
				new Vec3([range.max.x, range.max.y, 0]),
				new Vec3([range.max.x, range.min.y, 0]),
				new Vec3([range.min.x, range.min.y, 0]),
			])
			.reduce((acc: number[], cur: Vec3) => acc.concat([...cur]), []);
	}

	constructor(device: GPUDevice, chart: GPUBuffer) {
		const uniform = createBuffer({
			device,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
			data: new Float32Array([
				0.2, 0.2, 0.2, 1, // backgroundColor
				0, 0, 0, 1, // lineColor
				2, // lineThickness
				0, // horizontalLinesLen (u32)
				0, // verticalLinesLen (u32)
			])
		});
		const horizontalLines = createBuffer({
			device,
			data: new Float32Array(64)
		});
		const verticalLines = createBuffer({
			device,
			data: new Float32Array(64)
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

		const verticalLines: number[] = [];
		for (let i = new Date(this.range.min.x); i < new Date(this.range.max.x); i = getNext(i, 'year')) {
		verticalLines.push(i.getTime());
		}
		this.device.queue.writeBuffer(this.verticalLines, 0, new Float32Array(
			verticalLines.map(v => v * this.scale.x - camPos.x)
		));

		const horizontalLines = [10, 20, 30, 40, 50];
		this.device.queue.writeBuffer(this.horizontalLines, 0, new Float32Array(
			horizontalLines.map(v => v * this.scale.y - camPos.y)
		));
		this.device.queue.writeBuffer(this.uniform, 9 * 4, new Uint32Array([
			horizontalLines.length, verticalLines.length,
		]));
	}
}
