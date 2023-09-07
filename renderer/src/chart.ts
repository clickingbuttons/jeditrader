import { Vec3 } from '@jeditrader/linalg';
import { Camera } from './camera.js';
import { Axes } from './axes.js';
import { OHLCV } from './ohlcv.js';
import { Trades } from './trades.js';
import { Input } from './input.js';
import { Aggregate, Period, Provider, minDate, maxDate, Trade, getNext } from '@jeditrader/providers';
import { lods, lodKeys, Range } from './lod.js';
import { createBuffer } from './util.js';

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

export class Chart {
	device: GPUDevice;
	uniform: GPUBuffer;

	ticker: string;
	input: Input;
	camera: Camera;
	axes: Axes;
	axesScale = new Vec3([1, 1e9, 1]);
	provider: Provider;
	forceRender = false;

	lods = lods;
	lod: Period = 'year';
	lockLod = false;

	constructor(
		canvas: HTMLCanvasElement,
		device: GPUDevice,
		provider: Provider,
		ticker: string,
	) {
		this.device = device;

		this.input = new Input(canvas);
		this.camera = new Camera(canvas);
		this.uniform = createBuffer({
			device,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
			data: this.uniformData(),
		});
		this.axes = new Axes(device, this.uniform);
		this.provider = provider;
		this.ticker = '';
		this.setTicker(ticker);
	}

	uniformData(): Float32Array {
		return new Float32Array([
			...this.camera.viewProj(),
			...this.camera.eye, 0,
			...this.camera.eye.f32Low(), 0,
			...this.axesScale.f32(), 0,
		]);
	}

	onData(lod: Period, data: Aggregate[] | Trade[]) {
		if (data.length == 0) return;
		this.forceRender = true;
		console.log('onData', lod, data.length)
		if ((data[0] as Aggregate).open !== undefined) {
			data = data as Aggregate[];
			if (lod === 'year') this.axes.setRange(toBounds(data, lod));
			const ohlcv = (this.lods[lod].data as OHLCV) || new OHLCV(this.device, this.uniform);
			ohlcv.updateGeometry(data, lod);
			this.lods[lod].data = ohlcv;
		} else {
			const trades = (this.lods[lod].data as Trades) || new Trades(this.device, this.uniform);
			trades.updateGeometry(data as Trade[]);
			this.lods[lod].data = trades;
		}
	}

	setTicker(ticker: string) {
		if (this.ticker === ticker) return;
		this.ticker = ticker;

		Object.values(this.lods).forEach(l => {
			l.data?.destroy();
			l.data = undefined;
		});
		// Even 100 years of daily aggs are only ~1MB.
		// Because of this, just cache everything that's daily or above.
		(['year', 'month', 'week', 'day'] as Period[]).forEach(lod => {
			this.provider[lod](this.ticker, minDate, new Date(), aggs => this.onData(lod, aggs));
		});
	}

	fetchPage() {
		const horizonDistance = this.camera.eye.z * 2;
		console.log('horizonDistance', horizonDistance)
		const from = new Date((this.camera.eye.x - horizonDistance));
		const to = new Date((this.camera.eye.x + horizonDistance));

		// temporarily until panning is implemented
		this.lods[this.lod].data?.destroy();
		this.lods[this.lod].data = undefined;
		this.provider[this.lod](this.ticker, from, to, aggs => this.onData(this.lod, aggs));
	}

	updateLod(cameraZ: number): boolean {
		if (this.lockLod) return false;

		const lastLod = this.lod;
		for (var i = lodKeys.length - 1; i >= 0; i--) {
			const period = lodKeys[i];
			if (cameraZ < this.lods[period].cameraZ) {
				const newLod = lodKeys[i];
				if (newLod !== lastLod) {
					this.lod = newLod;
					if (lodKeys.indexOf(newLod) >= lodKeys.indexOf('hour4')) this.fetchPage();
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
		this.axes.update(this.camera.eye);

		this.device.queue.writeBuffer(this.uniform, 0, this.uniformData());

		const needsRerender = this.input.focused || lodChanged || this.forceRender;
		this.forceRender = false;
		return needsRerender;
	}

	render(pass: GPURenderPassEncoder) {
		this.axes.render(pass);
		this.lods[this.lod].data?.render(pass);
	}

	toggleWireframe() {
		this.axes.toggleWireframe();
		Object.values(this.lods).forEach(l => l.data?.toggleWireframe());
		this.forceRender = true;
	}
};
