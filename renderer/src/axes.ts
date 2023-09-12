import { Mesh, BufferBinding } from './mesh.js';
import { Vec3 } from '@jeditrader/linalg';
import { createBuffer } from './util.js';
import { Range } from './util.js';
import { getNext, Period } from '@jeditrader/providers';
import { Labels, SceneToClip } from './labels.js';
import { toymd } from './helpers.js';

const wgslStruct = `struct Axes {
	backgroundColor: vec4f,
	lineColor: vec4f,
	lineThickness: f32,
	horizontalLinesLen: u32,
	verticalLinesLen: u32,
}`;
const vertCode = `
	let p = pos(arg);
	return VertexOutput(chart.proj * chart.view * p, p.xy);
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

function pad2(n: number) {
	return (n + '').padStart(2, '0');
}

function toLabel(period: Period, ms: number): string {
	let d = new Date(ms);
	switch (period) {
	case 'year':
		return '' + d.getUTCFullYear();
	case 'month':
		return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`
	case 'week':
	case 'day':
		return toymd(d);
	case 'hour4':
	case 'hour':
		return `${toymd(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
	case 'minute5':
	case 'minute':
		return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
	case 'trade':
		return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
	default:
		throw new Error('unknown period ' + period);
	}
}

export class Axes extends Mesh {
	range: Range<Vec3>;
	scale = new Vec3([1, 1e9, 1]);

	uniform: GPUBuffer;
	horizontalLines: GPUBuffer;
	verticalLines: GPUBuffer;

	labels: Labels;

	getGeometry(eye: Vec3) {
		const camPos = eye.div(this.scale);
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

	constructor(
		device: GPUDevice,
		chartUniform: GPUBuffer,
		range: Range<Vec3>,
		canvas: HTMLCanvasElement,
		sceneToClip: SceneToClip,
	) {
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
			chartUniform,
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
		this.range = range;
		this.uniform = uniform;
		this.horizontalLines = horizontalLines;
		this.verticalLines = verticalLines;
		this.labels = new Labels(canvas, sceneToClip);
	}

	update(eye: Vec3, period: Period) {
		this.updatePositions(this.getGeometry(eye));

		// Only render lines around camera.
		const start = getNext(new Date(eye.x), period, -maxLines / 2, true);
		const end = getNext(new Date(eye.x), period, maxLines / 2 - 1, true);

		const verticalLines: number[] = [];
		for (
			let epochMs = start.getTime();
			epochMs < end.getTime();
			epochMs = getNext(new Date(epochMs), period).getTime()
		) {
			if (epochMs > this.range.min.x && epochMs < this.range.max.x) verticalLines.push(epochMs);
		}
		this.device.queue.writeBuffer(this.verticalLines, 0, new Float32Array(
			verticalLines.map(v => v * this.scale.x - eye.x)
		));

		const horizontalLines = [10, 20];
		this.device.queue.writeBuffer(this.horizontalLines, 0, new Float32Array(
			horizontalLines.map(v => v * this.scale.y - eye.y)
		));

		this.device.queue.writeBuffer(this.uniform, 9 * 4, new Uint32Array([
			horizontalLines.length, verticalLines.length,
		]));

		this.labels.setLabels(
			horizontalLines
				.map(l => ({
					text: '$' + l,
					pos: new Vec3([this.range.min.x, l, 0])
				}))
				.concat(
					verticalLines.map(l => ({
						text: toLabel(period, l),
						pos: new Vec3([l, this.range.min.y, 0])
					}))
				)
		);
	}
}
