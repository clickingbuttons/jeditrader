import { Vec3 } from '@jeditrader/linalg';
import { Period, Aggregate, Trade, Provider, minDate, maxDate, getNext } from '@jeditrader/providers';
import { OHLCV } from './ohlcv.js';
import { Trades } from './trades.js';
import { Range } from './util.js';

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

export class ChartData {
	device: GPUDevice;
	uniform: GPUBuffer;
	provider: Provider;

	ticker: string = '';
	// Don't assign this, `Axes` holds a ref.
	range: Range<Vec3> = {
		min: new Vec3([-5000, -5000, -5000]),
		max: new Vec3([5000, 5000, 5000])
	};

	meshes;
	lowerLod: Period = 'year';
	lod: Period = 'month';
	lockLod = false;

	constructor(
		device: GPUDevice,
		chartUniform: GPUBuffer,
		provider: Provider,
		ticker: string,
	) {
		this.device = device;
		this.uniform = chartUniform;
		this.provider = provider;
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
		Object.entries(this.meshes).forEach(([p, m]) => m.visible = p === this.lod);

		this.setTicker(ticker);
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

	setTicker(ticker: string) {
		if (this.ticker === ticker) return;
		this.ticker = ticker;

		Object.values(this.meshes).forEach(m => m.nInstances = 0);
		// Even 100 years of daily aggs are only ~1MB.
		// Because of this, just cache everything that's daily or above.
		(['year', 'month', 'week', 'day'] as Exclude<Period, 'trade'>[]).forEach(lod => {
			this.provider[lod](ticker, minDate, new Date(), aggs => this.onAggs(lod, aggs));
		});
	}

	fetchPage(eye: Vec3) {
		const horizonDistance = eye.z * 2;
		const from = new Date((eye.x - horizonDistance));
		const to = new Date((eye.x + horizonDistance));

		// temporarily until panning is implemented
		this.meshes[this.lod].nInstances = 0;

		if (this.lod === 'trade') {
			this.provider.trade(this.ticker, from, to, data => this.onTrades(data));
		} else {
			const lod = this.lod as Exclude<Period, 'trade'>;
			this.provider[lod](this.ticker, from, to, data => this.onAggs(lod, data));
		}
	}

	update(eye: Vec3): number {
		if (this.lockLod) return 0;

		const lodKeys = Object.keys(cameraZs) as Period[];
		const lastLod = this.lod;
		for (var i = lodKeys.length - 1; i >= 0; i--) {
			const period = lodKeys[i];
			if (eye.z < cameraZs[period]) {
				const newLod = lodKeys[i];

				// if (newLod > 3) this.fetchPage();
				if (newLod !== lastLod) {
					this.lod = newLod;
					this.lowerLod = lodKeys[Math.max(i - 1, 0)];
					Object.entries(this.meshes).forEach(([p, m]) => m.visible = p === this.lod);
					console.log('visible', this.lod);

					if (lodKeys.indexOf(newLod) >= lodKeys.indexOf('hour4')) this.fetchPage(eye);
					return 1;
				} else {
					return 0;
				}
			}
		}

		return 0;
	}

	render(pass: GPURenderPassEncoder): void {
		Object.values(this.meshes).forEach(m => m.render(pass));
	}

	toggleWireframe(): void {
		Object.values(this.meshes).forEach(m => m.toggleWireframe());
	}
}

