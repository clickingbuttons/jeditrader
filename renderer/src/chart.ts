import { Vec3 } from '@jeditrader/linalg';
import { Camera } from './camera.js';
import { Axes } from './axes.js';
import { OHLCV, timeOffset } from './ohlcv.js';
import { Input } from './input.js';
import { Aggregate, AggRange, Period, Range, Provider } from '@jeditrader/providers';
import { toymd } from './helpers.js';
import { Lod, lods, minCellSize } from './lod.js';
import { Mesh, MeshOptions  } from './mesh.js';
import { Cube } from '@jeditrader/geometry';

export const unitsPerMs = minCellSize;
export const unitsPerDollar = minCellSize * 2e9;

export function getNext(d: Date, p: Period): Date {
	const res = new Date(d);
	switch (p) {
	case 'year':
		res.setFullYear(d.getFullYear() + 1);
		break;
	case 'month':
		res.setMonth(d.getMonth() + 1);
		break;
	case 'week':
		res.setDate(d.getDate() + 7);
		break;
	case 'day':
		res.setDate(d.getDate() + 1);
		break;
	case 'hour':
		res.setHours(d.getHours() + 1);
		break;
	case 'minute':
		res.setMinutes(d.getMinutes() + 1);
		break;
	default:
		throw new Error('unknown period ' + p);
	}
	return res;
}

function toBounds(agg: AggRange, period: Period): Range<Vec3> {
	const min = new Vec3(
		(agg.time.min.getTime() - timeOffset) * unitsPerMs,
		agg.low.min * unitsPerDollar,
		0
	);
	const max = new Vec3(
		(getNext(agg.time.max, period).getTime() - timeOffset) * unitsPerMs,
		agg.high.max * unitsPerDollar,
		Math.sqrt(agg.volume.max)
	);

	return { min, max };
}

export class Chart {
	ticker: string;
	input: Input;
	camera: Camera;
	ohlcv: OHLCV;
	cubes: Mesh[];
	axes: Axes;
	provider: Provider;
	forceRender = false;

	lods: Lod[] = [ ...lods ];
	lod = -1;
	lockLod = false;

	constructor(
		canvas: HTMLCanvasElement,
		device: GPUDevice,
		provider: Provider,
		ticker: string,
	) {
		this.input = new Input(canvas);
		this.camera = new Camera(canvas, device);
		this.ohlcv = new OHLCV(device, this.camera);
		this.axes = new Axes(device, this.camera);
		this.provider = provider;
		this.ticker = ticker;

		const origin = new Date(0);
		const millseconds: number[] = lods
			.map(({ name }) => getNext(origin, name).getTime())
			.concat(1e3, 1);
		this.cubes = [];
		millseconds.forEach(ms => {
			const radius = ms * unitsPerMs / 2;
			const rad3 = new Vec3(radius, radius, radius);

			const cube0 = new Cube(new Vec3(0, 0, 0), rad3);
			const cube1 = new Cube(new Vec3((timeOffset - 1e12) * unitsPerMs, 4e4, 0), rad3);
			let options: Partial<MeshOptions> = {};
			if (ms <= 1e3) options.fragCode = `return vec4f(camera.eyeLow, 1.0);`;

			const mesh0 = Mesh.fromCSG(device, this.camera, cube0, options);
			const mesh1 = Mesh.fromCSG(device, this.camera, cube1, options);
			this.cubes.push(mesh0);
			this.cubes.push(mesh1);
		});

		this.updateAggData(this.lods[0], false);
	}

	onData(aggs: Aggregate[], period: Period, range: AggRange) {
		const lodIndex = this.lods.findIndex(l => l.name === period);
		const lod = this.lods[lodIndex];
		if (!lod) throw new Error('unknown lod ' + period);

		lod.aggs = aggs;
		lod.range = range;
		this.forceRender = true;
	}

	setTicker(ticker: string) {
		if (this.ticker === ticker) return;

		this.ticker = ticker;
		this.lods.forEach(lod => {
			lod.aggs = undefined;
			lod.range = undefined;
		});

		this.updateAggData(this.lods[this.lod]);
	}

	updateAggData(lod: Lod, updateGeometry: boolean = true) {
		// Even 100 years of daily aggs are only ~1MB.
		// Because of this, just cache everything that's daily or above.
		if (this.lod <= 3) {
			console.log('lod', this.lod, lod);
			if (lod.aggs && updateGeometry) {
				this.ohlcv.updateGeometry(this.lods[this.lod]);
			} else {
				const from = '1800-01-01';
				const to = toymd(new Date());
				this.provider[lod.name](this.ticker, from, to).then(({ aggs, range }) => {
					this.onData(aggs, lod.name, range);
					if (lod.name === 'year') this.axes.setRange(toBounds(range, lod.name));
					if (updateGeometry) this.ohlcv.updateGeometry(lod);
				});
			}
		} else {
			console.log('high lod', this.lod, lod);

			const horizonDistance = this.camera.eye.z * 4;
			const from = toymd(new Date((this.camera.eye.x - horizonDistance) / unitsPerMs + timeOffset));
			const to = toymd(new Date((this.camera.eye.x + horizonDistance) / unitsPerMs + timeOffset));
			console.log(from, to)
			this.provider[lod.name](this.ticker, from, to).then(({ aggs, range }) => {
				this.onData(aggs, lod.name, range);
				if (updateGeometry) this.ohlcv.updateGeometry(lod);
			});
		}
	}

	updateLod(cameraZ: number): boolean {
		if (this.lockLod) return false;

		const lastLod = this.lod;
		for (var i = this.lods.length - 1; i >= 0; i--) {
			if (cameraZ < this.lods[i].cameraZ) {
				const newLod = i;
				if (newLod !== lastLod) {
					this.lod = newLod;
					this.updateAggData(this.lods[newLod]);

					return true;
				} else {
					// if (this.lod > 3) console.log('maybe update data');
					return false;
				}
			}
		}

		return false;
	}

	update(dt: DOMHighResTimeStamp): boolean {
		this.camera.update(dt, this.input);
		const lodChanged = this.updateLod(this.camera.eye.z);
		this.input.update();
		this.axes.update();
		this.cubes.forEach(c => c.update());
		this.ohlcv.update();

		const res = this.input.focused || lodChanged || this.forceRender;
		this.forceRender = false;
		return res;
	}

	render(pass: GPURenderPassEncoder) {
		this.axes.render(pass);
		this.ohlcv.render(pass);
		this.cubes.forEach(c => c.render(pass));
	}

	toggleWireframe() {
		this.axes.toggleWireframe();
		this.ohlcv.toggleWireframe();
		this.cubes.forEach(c => c.toggleWireframe());
		this.forceRender = true;
	}
};
