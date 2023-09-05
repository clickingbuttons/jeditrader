import { Vec3 } from '@jeditrader/linalg';
import { Camera } from './camera.js';
import { Axes } from './axes.js';
import { OHLCV } from './ohlcv.js';
import { Input } from './input.js';
import { Aggregate, Period, Provider, minDate, maxDate } from '@jeditrader/providers';
import { Lod, lods, minCellSize, Range } from './lod.js';

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

function toBounds(aggs: Aggregate[], period: Period): Range<Vec3> {
	let minTime = maxDate;
	let maxTime = minDate;
	let minPrice = Number.MAX_VALUE;
	let maxPrice = Number.MIN_VALUE;
	let maxVolume = Number.MIN_VALUE;

	for (var i = 0; i < aggs.length; i++) {
		var agg = aggs[i];
		if (agg.time < minTime) minTime = agg.time;
		if (agg.time > maxTime) maxTime = agg.time;

		if (agg.low < minPrice) minPrice = agg.low;
		if (agg.high > maxPrice) maxPrice = agg.high;

		if (agg.volume > maxVolume) maxVolume = agg.volume;
	}

	const min = new Vec3(
		minTime.getTime() * unitsPerMs,
		minPrice * unitsPerDollar,
		0
	);
	const max = new Vec3(
		getNext(maxTime, period).getTime() * unitsPerMs,
		maxPrice * unitsPerDollar,
		Math.sqrt(maxVolume)
	);

	return { min, max };
}

export class Chart {
	device: GPUDevice;
	ticker: string;
	input: Input;
	camera: Camera;
	axes: Axes;
	provider: Provider;
	forceRender = false;

	lods: Lod[] = lods.map(l => ({ ...l }));
	lod = -1;
	lockLod = false;

	constructor(
		canvas: HTMLCanvasElement,
		device: GPUDevice,
		provider: Provider,
		ticker: string,
	) {
		this.device = device;
		this.input = new Input(canvas);
		this.camera = new Camera(canvas, device);
		this.axes = new Axes(device, this.camera);
		this.provider = provider;
		this.ticker = '';
		this.setTicker(ticker);
	}

	onData(lod: number, aggs: Aggregate[]) {
		const name = this.lods[lod].name;
		console.log('onData', name, aggs.length)
		this.forceRender = true;
		if (name === 'year') this.axes.setRange(toBounds(aggs, name));
		const ohlcv = this.lods[lod].ohlcv || new OHLCV(this.device, this.camera);
		ohlcv.updateGeometry(aggs, name);
		this.lods[lod].ohlcv = ohlcv;
	}

	setTicker(ticker: string) {
		if (this.ticker === ticker) return;
		this.ticker = ticker;

		this.lods.forEach(l => {
			l.ohlcv?.destroy();
			l.ohlcv = undefined;
		});
		// Even 100 years of daily aggs are only ~1MB.
		// Because of this, just cache everything that's daily or above.
		[0, 1, 2, 3].forEach(lod => {
			const name = this.lods[lod].name;
			this.provider[name](this.ticker, minDate, new Date(), aggs => this.onData(lod, aggs));
		});
	}

	fetchPage() {
		const horizonDistance = Math.sqrt(this.camera.eye.z) << 12;
		console.log('horizonDistance', horizonDistance)
		const from = new Date((this.camera.eye.x - horizonDistance) / unitsPerMs);
		const to = new Date((this.camera.eye.x + horizonDistance) / unitsPerMs);

		// temporarily until panning is implemented
		this.lods[this.lod].ohlcv?.destroy();
		this.lods[this.lod].ohlcv = undefined;
		const name = this.lods[this.lod].name;
		this.provider[name](this.ticker, from, to, aggs => this.onData(this.lod, aggs));
	}

	updateLod(cameraZ: number): boolean {
		if (this.lockLod) return false;

		const lastLod = this.lod;
		for (var i = this.lods.length - 1; i >= 0; i--) {
			if (cameraZ < this.lods[i].cameraZ) {
				const newLod = i;
				if (newLod !== lastLod) {
					this.lod = newLod;
					if (newLod > 3) this.fetchPage();
					return true;
				} else {
					return false;
				}
			}
		}

		return false;
	}

	update(dt: DOMHighResTimeStamp): boolean {
		this.camera.update(dt, this.input);
		const lodChanged = this.updateLod(this.camera.eye.z);
		// if (this.lod > 3) this.fetchPage();
		this.input.update();
		this.axes.update();

		const res = this.input.focused || lodChanged || this.forceRender;
		this.forceRender = false;
		return res;
	}

	render(pass: GPURenderPassEncoder) {
		this.axes.render(pass);
		this.lods[this.lod].ohlcv?.render(pass);
	}

	toggleWireframe() {
		this.axes.toggleWireframe();
		this.lods.forEach(l => l.ohlcv?.toggleWireframe());
		this.forceRender = true;
	}
};
