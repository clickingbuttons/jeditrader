import { Vec3 } from '@jeditrader/linalg';
import { signal } from '@preact/signals-core';
import { Period, Aggregate, Trade, Provider, minDate, maxDate, getNext } from '@jeditrader/providers';
import { OHLCV } from './ohlcv.js';
import { Trades } from './trades.js';
import { Range } from './util.js';
import { Camera } from './camera.js';

function toBounds(aggs: Aggregate[], period: Exclude<Period, 'trade'>): Range<Vec3> {
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

	const min = new Vec3([
		minTime.getTime(),
		minPrice,
		0
	]);
	const max = new Vec3([
		getNext(maxTime, period).getTime(),
		maxPrice,
		Math.sqrt(maxVolume)
	]);

	return { min, max };
}

const cameraZs: { [p in Period]: number } = {
	'year': Number.MAX_VALUE,
	'month': 1e12,
	'week': 40e9,
	'day': 10e9,
	'hour4': 3e9,
	'hour': 1e9,
	'minute5': 100e6,
	'minute': 20e6,
	'trade': 10e6,
};
const lodKeys = Object.keys(cameraZs) as Period[];
export type Lod = Period | 'auto';
export const lods: Lod[] = ['auto', ...lodKeys];

export class ChartData {
	device: GPUDevice;
	uniform: GPUBuffer;
	provider: Provider;
	camera: Camera;

	ticker = signal('F');
	// Don't assign this, `Axes` holds a ref.
	range: Range<Vec3> = {
		min: new Vec3([-5000, -5000, -5000]),
		max: new Vec3([5000, 5000, 5000])
	};

	meshes;
	lod = signal<Period>('month');
	lowerLod: Period = 'year';

	autoLod = signal(true);
	autoLodPeriod = signal<Period>(this.lod.value);

	constructor(
		device: GPUDevice,
		chartUniform: GPUBuffer,
		provider: Provider,
		camera: Camera,
	) {
		this.device = device;
		this.uniform = chartUniform;
		this.provider = provider;
		this.camera = camera;

		this.meshes = {
			'year': new OHLCV(device, chartUniform),
			'month': new OHLCV(device, chartUniform),
			'week': new OHLCV(device, chartUniform),
			'day': new OHLCV(device, chartUniform),
			'hour4': new OHLCV(device, chartUniform),
			'hour': new OHLCV(device, chartUniform),
			'minute5': new OHLCV(device, chartUniform),
			'minute': new OHLCV(device, chartUniform),
			'trade': new Trades(device, chartUniform),
		};
		Object.entries(this.meshes).forEach(([p, m]) => m.visible = p === this.lod.value);

		this.ticker.subscribe(ticker => {
			Object.values(this.meshes).forEach(m => m.nInstances = 0);
			// Even 100 years of daily aggs are only ~1MB.
			// Because of this, just cache everything that's daily or above.
			(['year', 'month', 'week', 'day'] as Exclude<Period, 'trade'>[]).forEach(lod => {
				this.provider[lod](ticker, minDate, new Date(), aggs => this.onAggs(lod, aggs));
			});
		});
		this.lod.subscribe((lod: Period) => {
			console.log('lod change', lod)
			const lodIndex = lodKeys.indexOf(lod);
			this.lowerLod = lodKeys[Math.max(lodIndex - 1, 0)];
			Object.entries(this.meshes).forEach(([p, m]) => m.visible = p === lod);

			if (lodKeys.indexOf(lod) >= lodKeys.indexOf('hour4')) this.fetchPage();
		});
	}

	onAggs(lod: Exclude<Period, 'trade'>, data: Aggregate[]) {
		if (data.length == 0) return;
		console.log('onOHLCV', lod, data.length);
		(this.meshes[lod] as OHLCV).updateGeometry(data, lod);
		if (lod === 'year') {
			const { min, max } = toBounds(data, lod);
			this.range.min = min;
			this.range.max = max;
		}
	}

	onTrades(data: Trade[]) {
		if (data.length == 0) return;
		this.meshes.trade.updateGeometry(data);
	}

	fetchPage() {
		const { eye } = this.camera;
		const horizonDistance = eye.z * 2;
		const from = new Date((eye.x - horizonDistance));
		const to = new Date((eye.x + horizonDistance));
		const lod = this.lod.value;

		// temporarily until panning is implemented
		this.meshes[lod].nInstances = 0;

		if (lod === 'trade') {
			this.provider.trade(this.ticker.value, from, to, data => this.onTrades(data));
		} else {
			this.provider[lod](this.ticker.value, from, to, data => this.onAggs(lod, data));
		}
	}

	update() {
		for (var i = lodKeys.length - 1; i >= 0; i--) {
			const period = lodKeys[i];
			if (this.camera.eye.z < cameraZs[period]) {
				this.autoLodPeriod.value = period;
				if (this.autoLod.value) this.lod.value = period;
				break;
			}
		}
		// TODO: proper fetchPage
	}

	render(pass: GPURenderPassEncoder): void {
		Object.values(this.meshes).forEach(m => m.render(pass));
	}

	toggleWireframe(): void {
		Object.values(this.meshes).forEach(m => m.toggleWireframe());
	}
}

