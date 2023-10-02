import { Mesh } from './mesh.js';
import { BufferBinding } from './shader-binding.js';
import { Vec3, Vec4, Mat4, clamp } from '@jeditrader/linalg';
import { createBuffer } from './util.js';
import { getNext, Period } from '@jeditrader/providers';
import { Labels } from './labels.js';
import { toymd } from './helpers.js';
import { signal, effect, computed, batch, Signal } from '@preact/signals-core';
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
				hoverColor: vec4f,
				hover: vec2f,
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
			...this.settings.hoverColor.value,
			this.eyeX(this.hoverX.value), this.eyeY(this.hoverY.value),
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

	eye: Signal<Vec3>;
	settings;

	verticalLines = signal([] as number[]);
	horizontalLines = signal([] as number[]);
	hoverX = signal(new Date(2014, 0).getTime());
	hoverY = signal(20);
	labels: Labels;

	range = signal<Range<Vec3>>({
		min: new Vec3(new Date(0).getTime(), 0, 0),
		max: new Vec3(new Date().getTime(), 100, 0)
	});
	scale = signal(new Vec3(1, 1, 1));
	minTick = signal(0.01);

	model = signal(Mat4.scale(this.scale.value));
	modelInv = computed(() => this.model.value.inverse());

	constructor(scene: Scene) {
		const { device } = scene;

		super(device, new Array(nVertices * 3).fill(0), indices);

		this.eye = scene.camera.eye;
		this.labels = new Labels(scene, this.model);

		this.settings = {
			backgroundColor: signal([.3, .3, .3, 1]),
			lineColor: signal([0, 0, 0, 1]),
			hoverColor: signal([1, .6, .6, 1]),
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
			this.scale.value = new Vec3(1, desiredHeight / len.y, 1);
			this.model.value = Mat4.scale(this.scale.value);
		});

		effect(() => this.updatePositions(this.getGeometry()));
		effect(() => this.updateUniform(scene));
		effect(() => this.updateLines(scene));
		effect(() => {
			this.updateModels(this.model.value);
			scene.flags.rerender = true;
		});
	}

	eyeX(x: number) {
		return new Vec4(x, 0, 0, 1).transform(this.model.value).x - this.eye.value.x;
	}

	eyeY(y: number) {
		return new Vec4(0, y, 0, 1).transform(this.model.value).y - this.eye.value.y;
	}

	updateUniform(scene: Scene) {
		this.device.queue.writeBuffer(this.buffers.axes, 0, this.uniformData());
		scene.flags.rerender = true;
	}

	updateLines(scene: Scene) {
		const lodIndex = getLodIndex(this.eye.value.z);
		const period = lodKeys[Math.max(0, lodIndex - 1)];

		batch(() => {
			this.verticalLines.value = this.getVerticalLines(period);
			this.horizontalLines.value = this.getHorizontalLines();

			this.device.queue.writeBuffer(this.buffers.verticalLines, 0, new Float32Array(
				this.verticalLines.value.map(x => this.eyeX(x))
			));
			this.device.queue.writeBuffer(this.buffers.horizontalLines, 0, new Float32Array(
				this.horizontalLines.value.map(y => this.eyeY(y))
			));
			scene.flags.rerender = true;
		});

		const range = this.range.value;
		const verticalLabels = this.verticalLines.value.map(l => ({
			text: toLabel(period, l),
			pos: new Vec3(l, range.min.y, 0)
		}));
		const horizontalLabels = this.horizontalLines.value.map(l => ({
			text: '$' + l.toFixed(2),
			pos: new Vec3(range.min.x, l, 0)
		}));

		this.labels.setLabels(horizontalLabels.concat(verticalLabels));
	}

	getGeometry() {
		const eye = this.eye.value;
		const scale = this.scale.value;
		const range = this.range.value;

		const camPos = new Vec4(eye).transform(this.modelInv.value);
		const cameraZ = camPos.z;
		const lod0 = cameraZ;
		const lod1 = cameraZ * 16;

		const points = [
			new Vec3(camPos.x - lod0, camPos.y + lod0 / scale.y, 0),
			new Vec3(camPos.x + lod0, camPos.y + lod0 / scale.y, 0),
			new Vec3(camPos.x + lod0, camPos.y - lod0 / scale.y, 0),
			new Vec3(camPos.x - lod0, camPos.y - lod0 / scale.y, 0),

			new Vec3(camPos.x - lod1, camPos.y + lod1 / scale.y, 0),
			new Vec3(camPos.x + lod1, camPos.y + lod1 / scale.y, 0),
			new Vec3(camPos.x + lod1, camPos.y - lod1 / scale.y, 0),
			new Vec3(camPos.x - lod1, camPos.y - lod1 / scale.y, 0),
		];

		return points
			.map(p => p.clamp(range.min, range.max))
			.concat([
				new Vec3(range.min.x, range.max.y, 0),
				new Vec3(range.max.x, range.max.y, 0),
				new Vec3(range.max.x, range.min.y, 0),
				new Vec3(range.min.x, range.min.y, 0),
			])
			.reduce((acc, cur) => acc.concat([...cur]), [] as number[]);
	}

	getVerticalLines(period: Period): number[] {
		const eye = this.eye.value;
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

	getHorizontalLines(): number[] {
		const eye = this.eye.value;
		const range = this.range.value;
		const scale = this.model.value[5];
		const minTick = this.minTick.value;

		const minStep = minTick;
		const maxStep = (range.max.y - range.min.y) / 5;
		let step = clamp(eye.z / scale, minStep, maxStep);
		step = 10 ** Math.floor(Math.log10(step));

		const minCenter = range.min.y + maxLines / 2 * step;
		const maxCenter = range.max.y - maxLines / 2 * step;
		const center = clamp(
			new Vec4(0, eye.y, 0, 1).transform(this.modelInv.value).y,
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

	update(input: Input, hoverWorldPos: Vec3 | undefined) {
		if (!hoverWorldPos) return;

		const hoverAxesPos = new Vec4(hoverWorldPos)
			.transform(this.modelInv.value)
			.xyz();
		batch(() => {
			this.hoverX.value = hoverAxesPos.x;
			this.hoverY.value = hoverAxesPos.y;
		});

		const range = this.range.value;
		const hoveringAxes = hoverAxesPos.x > range.min.x && hoverAxesPos.x < range.max.x &&
			hoverAxesPos.y > range.min.y && hoverAxesPos.y < range.max.y;
		document.body.style.cursor = (input.buttons.shift && hoveringAxes) ? 'ns-resize' : 'auto';
		if (input.wheelY) {
			const origin = hoverAxesPos;
			console.log(input.wheelY);
			const scale = new Vec3(1, 1 + input.wheelY / 1e3, 1);
			const transform = Mat4
				.translate(origin)
				.scale(scale)
				.translate(origin.mulScalar(-1));

			this.model.value = this.model.value.mul(transform);
		}
	}

	render() {
		this.labels.render();
	}
}
