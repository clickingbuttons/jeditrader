import { Mesh } from './mesh.js';
import { Vec2, Vec3, Vec4, Mat4, clamp } from '@jeditrader/linalg';
import { createBuffer } from '../util.js';
import { getNext, Period } from '@jeditrader/providers';
import { Labels, Label } from '../labels.js';
import { toymd } from '../helpers.js';
import { signal, effect, computed, batch, Signal } from '@preact/signals-core';
import { lodKeys, getLodIndex } from '../lod.js';
import { Scene } from '../scenes/scene.js';
import { Vertex, Polygon, Range, Color } from '@jeditrader/geometry';
import { AxesResources } from '../materials/axes.js';
import {
  makeShaderDataDefinitions,
  makeStructuredView,
} from 'webgpu-utils';

// Unfortunately this is needed to prevent jitter when the camera is at z < 1000
//  8┌─────────┐9
//   │4┌─────┐5│
//   │ │0┌─┐1│ │
//   │ │3└─┘2│ │
//   │7└─────┘6│
// 11└─────────┘10
//
// Unfortunately it still has problems when the camera is close to an edge.
// If replacing this with quads, see:
// https://github.com/m-schuetz/webgpu_wireframe_thicklines/blob/master/renderWireframeThick.js
const nVertices = 12;
const indices = [
	0, 3, 2,
	2, 1, 0,
	4, 0, 5,
	0, 1, 5,
	5, 1, 6,
	2, 6, 1,
	7, 6, 2,
	7, 2, 3,
	0, 7, 3,
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

const code = `
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
`;
const defs = makeShaderDataDefinitions(code);
const myUniformValues = makeStructuredView(defs.structs.Axes);
console.log(defs, myUniformValues)

export class Axes extends Mesh {
	declare resources: AxesResources;

	uniformData() {
		myUniformValues.set({
			backgroundColor: this.settings.backgroundColor.value.pack(),
			lineColor: this.settings.lineColor.value.pack(),
			hoverColor: this.settings.hoverColor.value.pack(),
			selectColor: this.settings.selectColor.value.pack(),
			hover: [this.modelEyeX(this.hoverX.value), this.modelEyeY(this.hoverY.value)],
			selectStart: [
				this.modelEyeX(this.selectStart.value?.x ?? 0),
				this.modelEyeY(this.selectStart.value?.y ?? 0),
			],
			lineThickness: this.settings.lineThickness.value,
			horizontalLinesLen: this.horizontalLines.value.length,
			verticalLinesLen: this.verticalLines.value.length,
			selecting: +Boolean(this.selectStart.value),
		});
	}

	eye: Signal<Vec3>;
	eyeDir: Signal<Vec3>;
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

	selectStart: Signal<null | Vec3> = signal(null);

	constructor(scene: Scene) {
		const { device } = scene;

		super(device, new Float64Array(nVertices * 3), indices, {
			normals: new Array(nVertices).fill([0, 0, 1]).flat(),
		});

		this.eye = scene.camera.eye;
		this.eyeDir = scene.camera.dir;
		this.labels = new Labels(scene);

		this.settings = {
			backgroundColor: signal(new Color(77, 77, 77)),
			lineColor: signal(new Color(0, 0, 0)),
			hoverColor: signal(new Color(255, 133, 133)),
			selectColor: signal(new Color(146, 197, 237)),
			lineThickness: signal(2),
			labels: this.labels.settings,
		};

		this.resources.axes = {
			buffer: device.createBuffer({
				size: myUniformValues.arrayBuffer.byteLength,
				usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
			}),
		};
		this.resources.horizontalLines = {
			buffer: createBuffer({
				device,
				data: new Float32Array(maxLines)
			})
		};
		this.resources.verticalLines = {
			buffer: createBuffer({
				device,
				data: new Float32Array(maxLines)
			})
		};

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
			this.updateModel(this.model.value);
			scene.flags.rerender = true;
		});
	}

	modelEyeX(x: number) {
		return new Vec4(x, 0, 0, 1).transform(this.model.value).x - this.eye.value.x;
	}

	modelEyeY(y: number) {
		return new Vec4(0, y, 0, 1).transform(this.model.value).y - this.eye.value.y;
	}

	updateUniform(scene: Scene) {
		this.uniformData();
		this.device.queue.writeBuffer(this.resources.axes.buffer, 0, myUniformValues.arrayBuffer);
		scene.flags.rerender = true;
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
		const range = this.range.value;
		const eye = this.eye.value;
		const scale = this.model.value[5];
		const minTick = this.minTick.value;

		const minStep = minTick;
		const maxStep = (range.max.y - range.min.y) / 5;
		let step = clamp(Math.abs(eye.z) / scale, minStep, maxStep);
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
		for (let i = evenStart; i <= end; i += step) {
			res.push(i);
		}
		return res;
	}

	rangeWorldPolygon(): Polygon {
		const range = this.range.value;
		const verts = [
			new Vec2(range.min.x, range.min.y),
			new Vec2(range.max.x, range.min.y),
			new Vec2(range.max.x, range.max.y),
			new Vec2(range.min.x, range.max.y),
		];
		return new Polygon(verts
			.map(v => new Vec4(v.x, v.y, 0, 1))
			.map(v => v.transform(this.model.value).xyz())
			.map(v => new Vertex(v))
		);
	}

	viewWorldPolygon(scene: Scene): Polygon | undefined {
		return this.rangeWorldPolygon().clip(scene.viewPlanes());
	}

	updateLines(scene: Scene) {
		const lodIndex = getLodIndex(this.eye.value.z);
		const period = lodKeys[Math.max(0, lodIndex - 1)];

		const poly = this.viewWorldPolygon(scene);
		let range = this.range.value;
		if (poly) {
			const polyRange = poly.range();
			range = {
				min: new Vec4(polyRange.min, 1).transform(this.modelInv.value).xyz(),
				max: new Vec4(polyRange.max, 1).transform(this.modelInv.value).xyz(),
			};
		}

		batch(() => {
			this.verticalLines.value = this.getVerticalLines(period);
			this.horizontalLines.value = this.getHorizontalLines();

			this.device.queue.writeBuffer(this.resources.verticalLines.buffer, 0, new Float32Array(
				this.verticalLines.value.map(x => this.modelEyeX(x))
			));
			this.device.queue.writeBuffer(this.resources.horizontalLines.buffer, 0, new Float32Array(
				this.horizontalLines.value.map(y => this.modelEyeY(y))
			));
			scene.flags.rerender = true;
		});

		const verticalLabels = this.verticalLines.value
			.filter(x => x > range.min.x && x < range.max.x)
			.reverse()
			.concat(clamp(this.hoverX.value, range.min.x, range.max.x))
			.map((l, i, arr) => {
				const isHover = i === arr.length - 1;
				const pos = scene.sceneToClip(new Vec3(l, range.min.y, 0), this.model.value);
				if (pos.y < -1) pos.y = -1;
				return {
					text: toLabel(isHover ? lodKeys[lodIndex] : period, l),
					pos,
					isHover,
					textAlign: 'center',
				} as Label;
			});
		const horizontalLabels = this.horizontalLines.value
			.filter(y => y > range.min.y && y < range.max.y)
			.concat(clamp(this.hoverY.value, range.min.y, range.max.y))
			.map((l, i, arr) => {
				const pos = scene.sceneToClip(new Vec3(range.min.x, l, 0), this.model.value);
				if (pos.x < -1) pos.x = -1;
				return {
					text: '$' + l.toFixed(2),
					pos,
					isHover: i === arr.length - 1,
				} as Label;
			});

		this.labels.setLabels(verticalLabels.concat(horizontalLabels));
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

	viewToWorld(scene: Scene, x: number, y: number): Vec3 | undefined {
		const ray = scene.rayCast(x, y);
		// z + bt = 0
		// t = -z / b
		const t = -ray.point.z / ray.dir.z;
		if (Number.isFinite(t)) return ray.point.add(ray.dir.mulScalar(t));
	}

	update(scene: Scene) {
		const input = scene.input;
		const hoverWorldPos = this.viewToWorld(scene, input.posX, input.posY);
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
		if (input.wheelY) {
			const origin = hoveringAxes ? hoverAxesPos : range.max.add(range.min).divScalar(2);
			const scale = new Vec3(1, 1 + input.wheelY / 1e3, 1);
			const transform = Mat4
				.translate(origin)
				.scale(scale)
				.translate(origin.mulScalar(-1));

			this.model.value = this.model.value.mul(transform);
		}
		if (input.buttons.select && !this.selectStart.value) {
			console.log('selectStart', hoverAxesPos);
			this.selectStart.value = hoverAxesPos;
		} else if (!input.buttons.select && this.selectStart.value) {
			console.log('selectEnd', hoverAxesPos);
			this.selectStart.value = null;
		}
	}

	render() {
		this.labels.render();
	}
}
