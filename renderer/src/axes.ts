import { Mesh } from './mesh.js';
import { BufferBinding } from './shader-binding.js';
import { Vec3, Mat4 } from '@jeditrader/linalg';
import { createBuffer } from './util.js';
import { getNext, Period } from '@jeditrader/providers';
import { Labels } from './labels.js';
import { toymd } from './helpers.js';
import { Signal, computed, effect, signal } from '@preact/signals-core';
import { Range } from './util.js';
import { lodKeys, getLodIndex } from './lod.js';
import { Input } from './input.js';
import { Material } from './material.js';
import { Scene } from './scene.js';

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
	case 'second':
	case 'trade':
		return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
	default:
		throw new Error('unknown period ' + period);
	}
}

export class Axes extends Mesh {
	eye: Signal<Vec3>;
	scaleOffset?: Vec3;

	static bindGroup = {
		...Mesh.bindGroup,
		axes: new BufferBinding('axes', {
			type: 'uniform',
			visibility: GPUShaderStage.FRAGMENT,
			wgslStruct: `struct Axes {
	backgroundColor: vec4f,
	lineColor: vec4f,
	lineThickness: f32,
	horizontalLinesLen: u32,
	verticalLinesLen: u32,
}`,
			wgslType: 'Axes',
		}),
		horizontalLines: new BufferBinding('horizontalLines', { visibility: GPUShaderStage.FRAGMENT }),
		verticalLines: new BufferBinding('verticalLines', { visibility: GPUShaderStage.FRAGMENT }),
	};

	settings;
	labels: Labels;

	static material(device: GPUDevice) {
		return new Material(device, {
			bindings: Object.values(Axes.bindGroup),
			// depthWriteEnabled: false,
			cullMode: 'none',
			vertOutputFields: [ 'uv: vec2f' ],
			vertCode: `
let pos = position64(arg);
return VertexOutput(pos.proj, toVec4(pos.model).xy);
			`,
			// If replacing this with quads, use:
			// https://github.com/m-schuetz/webgpu_wireframe_thicklines/blob/master/renderWireframeThick.js
			fragCode: `
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
			`,
		});
	}

	constructor(scene: Scene, range: Signal<Range<Vec3>>) {
		const { device, aspectRatio, camera } = scene;
		const { eye } = camera;
		super(device, new Array(nVertices * 3).fill(0), indices);
		this.buffers.axes = createBuffer({
			device,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
			data: new Float32Array([
				0.3, 0.3, 0.3, 1, // backgroundColor
				0, 0, 0, 1, // lineColor
				2, // lineThickness
				0, // horizontalLinesLen (u32)
				0, // verticalLinesLen (u32)
			])
		});
		this.buffers.horizontalLines = createBuffer({
			device,
			data: new Float32Array(maxLines)
		});
		this.buffers.verticalLines = createBuffer({
			device,
			data: new Float32Array(maxLines)
		});
		this.labels = new Labels(scene);
		this.eye = eye;
		this.settings = {
			labels: this.labels.settings,
		};
		range.subscribe(console.log)
		// range.subscribe(r => {
		// 	const len = r.max.sub(r.min);
		// 	const desiredHeight = len.x / aspectRatio.value;
		// 	this.scaleY.value = desiredHeight / len.y;
		// });

		effect(() => this.updatePositions(this.getGeometry(this.eye.value, range.value)));
		effect(() => this.updateLabels(this.eye.value, range.value));
	}

	getGeometry(eye: Vec3, range: Range<Vec3>) {
		const camPos = eye;
		const cameraZ = camPos.z;
		const lod0 = cameraZ / 16;
		const lod1 = cameraZ;

		const points = [
			new Vec3([camPos.x - lod0, camPos.y + lod0, 0]),
			new Vec3([camPos.x + lod0, camPos.y + lod0, 0]),
			new Vec3([camPos.x + lod0, camPos.y - lod0, 0]),
			new Vec3([camPos.x - lod0, camPos.y - lod0, 0]),

			new Vec3([camPos.x - lod1, camPos.y + lod1, 0]),
			new Vec3([camPos.x + lod1, camPos.y + lod1, 0]),
			new Vec3([camPos.x + lod1, camPos.y - lod1, 0]),
			new Vec3([camPos.x - lod1, camPos.y - lod1, 0]),
		];

		return points
			.map(p => p.clamp(range.min, range.max))
			.concat([
				new Vec3([range.min.x, range.max.y, 0]),
				new Vec3([range.max.x, range.max.y, 0]),
				new Vec3([range.max.x, range.min.y, 0]),
				new Vec3([range.min.x, range.min.y, 0]),
			])
			.reduce((acc, cur) => acc.concat([...cur]), [] as number[]);
	}

	updateLabels(eye: Vec3, range: Range<Vec3>) {
		const lodIndex = getLodIndex(eye.z);
		const period = lodKeys[Math.max(0, lodIndex - 1)];

		// Only render lines around camera.
		const start = getNext(new Date(eye.x), period, -maxLines / 2, true);
		const end = getNext(new Date(eye.x), period, maxLines / 2 - 1, true);

		const verticalLines: number[] = [];
		for (
			let epochMs = start.getTime();
			epochMs < end.getTime();
			epochMs = getNext(new Date(epochMs), period).getTime()
		) {
			if (epochMs > range.min.x && epochMs < range.max.x) verticalLines.push(epochMs);
		}
		this.device.queue.writeBuffer(this.buffers.verticalLines, 0, new Float32Array(verticalLines));

		const yLen = range.max.y - range.min.y;
		let yStep = 10 ** Math.floor(Math.log10(yLen));
		if ((range.max.y - range.min.y) / yStep <= 2) yStep /= 10;
		const horizontalLines: number[] = [];
		for (let i = Math.ceil(range.min.y / yStep) * yStep; i <= range.max.y; i += yStep) {
			horizontalLines.push(i);
		}
		this.device.queue.writeBuffer(this.buffers.horizontalLines, 0, new Float32Array(horizontalLines));

		this.device.queue.writeBuffer(this.buffers.axes, 9 * 4, new Uint32Array([
			horizontalLines.length, verticalLines.length,
		]));

		this.labels.setLabels(
			horizontalLines
				.map(l => ({
					text: '$' + l.toFixed(2),
					pos: new Vec3([range.min.x, l, 0])
				}))
				.concat(
					verticalLines.map(l => ({
						text: toLabel(period, l),
						pos: new Vec3([l, range.min.y, 0])
					}))
				)
		);
	}

	// update(input: Input) {
	// 	document.body.style.cursor = input.buttons.shift ? 'ns-resize' : 'auto';
	// 	if (input.buttons.mouse0 && input.buttons.shift) {
	// 		const newVal = this.scale.value.clone();
	// 		// newVal.x += input.movementX;
	// 		newVal.y -= input.movementY * 100e6;
	// 		if (!this.scaleOffset) this.scaleOffset = new Vec3([new Date(2010, 1).getTime(), 10, 0]);
	// 		this.scale.value = newVal;
	// 	} else {
	// 		this.scaleOffset = undefined;
	// 	}
	// }

	render() {
		this.labels.render();
	}
}
