import { Mesh, BufferBinding } from './mesh.js';
import { Vec3 } from '@jeditrader/linalg';
import { createBuffer } from './util.js';
import { Range } from './lod.js';
import { getNext, Period } from '@jeditrader/providers';
import { Labels } from './labels.js';

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
// If replacing this with quads, use:
// https://github.com/m-schuetz/webgpu_wireframe_thicklines/blob/master/renderWireframeThick.js
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
const maxLines = 64;

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

	labels: Labels;

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
			data: new Float32Array(maxLines)
		});
		const verticalLines = createBuffer({
			device,
			data: new Float32Array(maxLines)
		});

		super(
			device,
			chart,
			new Array(nVertices * 3).fill(0),
			indices,
			{
				bindings: [
					new BufferBinding('axes', uniform, {
						type: 'uniform',
						visibility: GPUShaderStage.FRAGMENT,
						wgslStruct,
						wgslType: 'Axes',
					}),
					new BufferBinding(
						'horizontalLines',
						horizontalLines,
						{ visibility: GPUShaderStage.FRAGMENT }
					),
					new BufferBinding(
						'verticalLines',
						verticalLines,
						{ visibility: GPUShaderStage.FRAGMENT }
					),
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
		this.labels = new Labels(device, chart);
	}

	setRange(range: Range<Vec3>) {
		this.range = range;
		console.log(range)
	}

	update(camPos: Vec3, period: Period) {
		this.updatePositions(this.getGeometry(camPos));

		// Only render lines around camera.
		const start = getNext(new Date(camPos.x), period, -maxLines / 2, true);
		const end = getNext(new Date(camPos.x), period, maxLines / 2 - 1, true);

		const verticalLines: number[] = [];
		for (
			let epochMs = start.getTime();
			epochMs < end.getTime();
			epochMs = getNext(new Date(epochMs), period).getTime()
		) {
			verticalLines.push(epochMs);
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

		const translation = new Vec3([this.range.min.x, this.range.min.y, 0]);
		this.labels.setLabels([{
			text: 'FA',
			pos: translation.add(new Vec3([0, horizontalLines[0], 0])),
		}]);
	}

	render(pass: GPURenderPassEncoder): void {
		super.render(pass);
		this.labels.render(pass);
	}

	toggleWireframe() {
		super.toggleWireframe();
		this.labels.toggleWireframe();
	}
}
