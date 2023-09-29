import { Mesh } from './mesh.js';
import { BufferBinding } from './shader-binding.js';
import { Vec3, Vec4, Mat4, clamp } from '@jeditrader/linalg';
import { createBuffer } from './util.js';
import { getNext, Period } from '@jeditrader/providers';
import { Labels } from './labels.js';
import { toymd } from './helpers.js';
import { signal, effect, computed, batch } from '@preact/signals-core';
import { Range } from './util.js';
import { lodKeys, getLodIndex } from './lod.js';
import { Material } from './material.js';
import { Scene } from './scene.js';
import { Input } from './input.js';

// Unfortunately this is needed to prevent jitter when the camera is at z < 1000
//  8┌─────────┐9
//   │4┌─────┐5│
//   │ │0┌─┐1│ │
//   │ │3└─┘2│ │
//   │7└─────┘6│
// 11└─────────┘10
//
// If replacing this with quads, see:
// https://github.com/m-schuetz/webgpu_wireframe_thicklines/blob/master/renderWireframeThick.js
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

const vertCode = `
let pos = projected(arg);
return VertexOutput(pos.proj, toVec4(pos.eye).xy);
`;

const fragCode = `
let uv = arg.uv;
var dudv = vec2(
	length(vec2(dpdx(uv.x), dpdy(uv.x))),
	length(vec2(dpdx(uv.y), dpdy(uv.y)))
);
dudv *= axes.lineThickness;

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
`;

export class Axes extends Mesh {
	static bindGroup = {
		...Mesh.bindGroup,
		axes: new BufferBinding('axes', {
			type: 'uniform',
			visibility: GPUShaderStage.FRAGMENT,
			wgslStruct: `struct Axes {
				backgroundColor: vec4f,
				lineColor: vec4f,
				lineThickness: f32,
				horizontalLinesLen: f32,
				verticalLinesLen: f32,
			}`,
		}),
		horizontalLines: new BufferBinding('horizontalLines', { visibility: GPUShaderStage.FRAGMENT }),
		verticalLines: new BufferBinding('verticalLines', { visibility: GPUShaderStage.FRAGMENT }),
	};
	declare buffers: { [s in keyof typeof Axes.bindGroup]: GPUBuffer };

	uniformData() {
		return new Float32Array([
			...this.settings.backgroundColor.value,
			...this.settings.lineColor.value,
			this.settings.lineThickness.value,
			this.horizontalLines.value.length,
			this.verticalLines.value.length,
		]);
	}

	static material(device: GPUDevice) {
		return new Material(device, {
			bindings: Object.values(Axes.bindGroup),
			depthWriteEnabled: false,
			cullMode: 'none',
			vertOutputFields: [ 'uv: vec2f' ],
			vertCode,
			fragCode,
		});
	}

	settings;

	verticalLines = signal([] as number[]);
	horizontalLines = signal([] as number[]);
	labels: Labels;

	range = signal<Range<Vec3>>({
		min: new Vec3([new Date(0).getTime(), 0, 0]),
		max: new Vec3([new Date(2010, 1).getTime(), 100, 0])
	});
	scale = signal(new Vec3([1, 1, 1]));
	minTick = signal(0.01);

	model = signal(Mat4.scale(this.scale.value));
	modelInv = computed(() => this.model.value.inverse());

	transform = {
		origin: undefined as Vec3 | undefined,
		scale: signal(new Vec3([1, 1, 1]))
	};

	constructor(scene: Scene) {
		const { device, camera } = scene;
		const { eye } = camera;

		super(device, new Array(nVertices * 3).fill(0), indices);

		this.labels = new Labels(scene, this.model);

		this.settings = {
			backgroundColor: signal([.3, .3, .3, 1]),
			lineColor: signal([0, 0, 0, 1]),
			lineThickness: signal(2),
			labels: this.labels.settings,
		};

		this.buffers.axes = createBuffer({
			device,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
			data: this.uniformData(),
		});
		this.buffers.horizontalLines = createBuffer({
			device,
			data: new Float32Array(maxLines)
		});
		this.buffers.verticalLines = createBuffer({
			device,
			data: new Float32Array(maxLines)
		});

		this.range.subscribe(r => {
			const len = r.max.sub(r.min);
			const desiredHeight = len.x / scene.aspectRatio.value;
			this.scale.value = new Vec3([1, desiredHeight / len.y, 1]);
		});
		effect(() => this.updatePositions(this.getGeometry(eye.value)));
		effect(() => {
			const model = this.model.value;
			const horizontalLines = this.horizontalLines.value;
			const verticalLines = this.verticalLines.value;

			this.device.queue.writeBuffer(this.buffers.axes, 0, this.uniformData());
			this.device.queue.writeBuffer(this.buffers.verticalLines, 0, new Float32Array(
				verticalLines.map(v => new Vec4([v, 0, 0, 1]).transform(model).x - eye.value.x)
			));
			this.device.queue.writeBuffer(this.buffers.horizontalLines, 0, new Float32Array(
				horizontalLines.map(v => new Vec4([0, v, 0, 1]).transform(model).y - eye.value.y)
			));
			scene.flags.rerender = true;
		});
		effect(() => this.updateModels(this.model.value));
		effect(() => {
			const lodIndex = getLodIndex(eye.value.z);
			const period = lodKeys[Math.max(0, lodIndex - 1)];

			batch(() => {
				this.verticalLines.value = this.getVerticalLines(eye.value, period);
				this.horizontalLines.value = this.getHorizontalLines(eye.value);
			});

			const range = this.range.value;
			const verticalLabels = this.verticalLines.value.map(l => ({
				text: toLabel(period, l),
				pos: new Vec3([l, range.min.y, 0])
			}));
			const horizontalLabels = this.horizontalLines.value.map(l => ({
				text: '$' + l.toFixed(2),
				pos: new Vec3([range.min.x, l, 0])
			}));

			this.labels.setLabels(horizontalLabels.concat(verticalLabels));
		});

		effect(() => {
			const origin = this.transform.origin ?? new Vec3([0, 0, 0]);
			this.model.value = Mat4
				.translate(origin.mul(this.scale.value))
				.scale(this.scale.value.mul(this.transform.scale.value))
				.translate(origin.mulScalar(-1));

			this.updateModels(this.model.value);
			scene.flags.rerender = true;
		});
	}

	getGeometry(eye: Vec3) {
		const scale = this.scale.value;
		const range = this.range.value;

		const camPos = new Vec4([...eye, 1.0]).transform(this.modelInv.value);
		const cameraZ = camPos.z;
		const lod0 = cameraZ;
		const lod1 = cameraZ * 16;

		const points = [
			new Vec3([camPos.x - lod0, camPos.y + lod0 / scale.y, 0]),
			new Vec3([camPos.x + lod0, camPos.y + lod0 / scale.y, 0]),
			new Vec3([camPos.x + lod0, camPos.y - lod0 / scale.y, 0]),
			new Vec3([camPos.x - lod0, camPos.y - lod0 / scale.y, 0]),

			new Vec3([camPos.x - lod1, camPos.y + lod1 / scale.y, 0]),
			new Vec3([camPos.x + lod1, camPos.y + lod1 / scale.y, 0]),
			new Vec3([camPos.x + lod1, camPos.y - lod1 / scale.y, 0]),
			new Vec3([camPos.x - lod1, camPos.y - lod1 / scale.y, 0]),
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

	getVerticalLines(eye: Vec3, period: Period): number[] {
		const range = this.range.value;

		const minCenter = getNext(new Date(range.min.x), period, maxLines / 2).getTime();
		const maxCenter = getNext(new Date(range.max.x), period, -maxLines / 2).getTime();
		const center = clamp(eye.x, minCenter, maxCenter);

		const start = getNext(new Date(center), period, -maxLines / 2, true);
		const end = getNext(new Date(center), period, maxLines / 2 - 1, true);

		const res: number[] = [];
		for (let t = start; t < end; t = getNext(t, period)) {
			const ms = t.getTime();
			if (ms > range.min.x && ms < range.max.x) res.push(ms);
		}

		return res;
	}

	getHorizontalLines(eye: Vec3): number[] {
		const range = this.range.value;
		const scale = this.scale.value.y * this.transform.scale.value.y;
		const minTick = this.minTick.value;

		const minStep = minTick;
		const maxStep = (range.max.y - range.min.y) / 5;
		let step = clamp(10 ** Math.floor(Math.log10(eye.z / scale)), minStep, maxStep);

		const minCenter = range.min.y + maxLines / 2 * step;
		const maxCenter = range.max.y - maxLines / 2 * step;
		const center = clamp(
			new Vec4([0, eye.y, 0, 1]).transform(this.modelInv.value).y,
			minCenter,
			maxCenter
		);

		const start = Math.max(center - step * maxLines / 2, range.min.y);
		const end = Math.min(center + step * maxLines / 2, range.max.y);

		const res: number[] = [];
		const evenStart = Math.ceil(start / step) * step;
		for (let i = evenStart; i <= end; i += step) res.push(i);
		return res;
	}

	update(input: Input) {
		document.body.style.cursor = input.buttons.shift ? 'ns-resize' : 'auto';
		if (input.buttons.mouse0 && input.buttons.shift) {
			if (!this.transform.origin) this.transform.origin = new Vec3([0, 10, 0]);

			const scale = new Vec3([0, -input.movementY * 2, 0])
				.mul(this.transform.scale.value)
				.divScalar(1e3);

			this.transform.scale.value = this.transform.scale.value.add(scale);
		} else {
			this.transform.origin = undefined;
		}
	}

	render() {
		this.labels.render();
	}
}
