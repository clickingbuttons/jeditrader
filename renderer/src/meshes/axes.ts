import { Mesh } from './mesh.js';
import { Vec2, Vec3, Vec4, Mat4, clamp } from '@jeditrader/linalg';
import { createBuffer } from '../util.js';
import { getNext, Period } from '@jeditrader/providers';
import { Labels } from '../labels.js';
import { toymd } from '../helpers.js';
import { signal, effect, computed, batch, Signal } from '@preact/signals-core';
import { lodKeys, getLodIndex } from '../lod.js';
import { Scene } from '../scenes/scene.js';
import { Plane, Vertex, Polygon, Range, CSG } from '@jeditrader/geometry';
import { AxesResources } from '../materials/axes.js';

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

export class Axes extends Mesh {
	declare resources: AxesResources;

	uniformData() {
		return new Float32Array([
			...this.settings.backgroundColor.value,
			...this.settings.lineColor.value,
			...this.settings.hoverColor.value,
			this.modelEyeX(this.hoverX.value), this.modelEyeY(this.hoverY.value),
			this.settings.lineThickness.value,
			this.horizontalLines.value.length,
			this.verticalLines.value.length,
		]);
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

	constructor(scene: Scene) {
		const { device } = scene;

		super(device, new Float64Array(nVertices * 3), indices, {
			normals: new Array(nVertices).fill([0, 0, 1]).flat(),
		});

		this.eye = scene.camera.eye;
		this.eyeDir = scene.camera.dir;
		this.labels = new Labels(scene);

		this.settings = {
			backgroundColor: signal([.3, .3, .3, 1]),
			lineColor: signal([0, 0, 0, 1]),
			hoverColor: signal([1, .6, .6, 1]),
			lineThickness: signal(2),
			labels: this.labels.settings,
		};

		this.resources.axes = {
			buffer: createBuffer({
				device,
				usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
				data: this.uniformData(),
			})
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
		this.device.queue.writeBuffer(this.resources.axes.buffer, 0, this.uniformData());
		scene.flags.rerender = true;
	}

	viewPlanes(scene: Scene): Plane[] {
		const viewBounds = [
			// [0, 0] is center
			[-1, -1], // bottom left
			[-1, 1], // top left
			[1, 1], // top right
			[1, -1] // bottom right
		];
		const rays = viewBounds.map(b => scene.rayCastNDC(b[0], b[1]));
		const v = rays.map(r => ({
			near: new Vertex(r.point),
			far: new Vertex(r.point.add(r.dir)),
		}));
		// Useful for visual debugging
		// const csg = new CSG([
		// 	// near
		// 	new Polygon([v[0].near, v[1].near, v[2].near, v[3].near], new Color(255, 0, 0)),
		// 	// far
		// 	new Polygon([v[3].far , v[2].far , v[1].far , v[0].far ], new Color(255, 255, 0)),
		// 	// top
		// 	new Polygon([v[1].far , v[2].far , v[2].near, v[1].near], new Color(0, 255, 0)),
		// 	// bottom
		// 	new Polygon([v[0].near, v[3].near, v[3].far , v[0].far ], new Color(0, 255, 255)),
		// 	// left
		// 	new Polygon([v[1].far , v[1].near, v[0].near, v[0].far ], new Color(0, 0, 255)),
		// 	// right
		// 	new Polygon([v[2].near, v[2].far , v[3].far , v[3].near], new Color(255, 0, 255)),
		// ]);
		// Make normals easier to see
		// csg.polygons.forEach(p => p.vertices.forEach(v => v.normal = p.plane.normal.mulScalar(1e12)));
		// const edges = [
		// 	// TODO: proper edge dedup in Polygon. problem: { a, b } != { b, a }. custom comparison
		// 	// will be O(n^2), sorting not working
		// 	new Edge(v[0].near, v[1].near),
		// 	new Edge(v[1].near, v[2].near),
		// 	new Edge(v[2].near, v[3].near),
		// 	new Edge(v[3].near, v[0].near),

		// 	new Edge(v[0].far, v[1].far),
		// 	new Edge(v[1].far, v[2].far),
		// 	new Edge(v[2].far, v[3].far),
		// 	new Edge(v[3].far, v[0].far),

		// 	new Edge(v[0].near, v[0].far),
		// 	new Edge(v[1].near, v[1].far),
		// 	new Edge(v[2].near, v[2].far),
		// 	new Edge(v[3].near, v[3].far),
		// ];
		return [
			// near
			Plane.fromPoints(v[0].near, v[1].near, v[2].near),
			// far
			Plane.fromPoints(v[3].far , v[2].far , v[1].far ),
			// top
			Plane.fromPoints(v[1].far , v[2].far , v[2].near),
			// bottom
			Plane.fromPoints(v[0].near, v[3].near, v[3].far ),
			// left
			Plane.fromPoints(v[1].far , v[1].near, v[0].near),
			// right
			Plane.fromPoints(v[2].near, v[2].far , v[3].far ),
		];
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
		return this.rangeWorldPolygon().clip(this.viewPlanes(scene));
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

		// Trace from topLeft to topRight
		const verticalLabels = this.verticalLines.value
			.concat(clamp(this.hoverX.value, range.min.x, range.max.x))
			.map((l, i) => {
				const isHover = i === this.verticalLines.value.length;
				const pos = scene.sceneToClip(new Vec3(l, range.min.y, 0), this.model.value);
				if (pos.y < -1) pos.y = -1;
				return {
					text: toLabel(isHover ? lodKeys[lodIndex] : period, l),
					pos,
					isHover,
					textAlign: 'center',
				};
			});
		const horizontalLabels = this.horizontalLines.value
			.concat(clamp(this.hoverY.value, range.min.y, range.max.y))
			.map((l, i) => {
				const isHover = i === this.horizontalLines.value.length;
				const pos = scene.sceneToClip(new Vec3(range.min.x, l, 0), this.model.value);
				if (pos.x < -1) pos.x = -1;
				return {
					text: '$' + l.toFixed(2),
					pos,
					isHover,
				};
			});

		this.labels.setLabels(
			horizontalLabels.concat(verticalLabels).filter(l => l.pos.w > 0)
		);
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
		if (input.buttons.mouse1) {
			const poly = this.viewWorldPolygon(scene);
			scene.materials.noCull.unbindAll();
			if (poly) {
				const mesh = Mesh.fromCSG(this.device, new CSG([poly]));
				scene.materials.noCull.bind(mesh);
			}
		}
	}

	render() {
		this.labels.render();
	}
}
