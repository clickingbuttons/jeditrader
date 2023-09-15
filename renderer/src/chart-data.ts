import { Vec3 } from '@jeditrader/linalg';
import { signal, Signal, effect } from '@preact/signals-core';
import { Period, Aggregate, Trade, Provider, minDate, maxDate, getNext } from '@jeditrader/providers';
import { OHLCV } from './ohlcv.js';
import { Trades } from './trades.js';
import { Range } from './util.js';
import { RendererFlags } from './renderer.js';
import { lodKeys, getLodIndex } from './lod.js';
import { ChartContext } from './chart.js';

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

export class ChartData {
	device: GPUDevice;
	uniform: GPUBuffer;
	provider: Provider;

	ticker = signal('F');
	range: Signal<Range<Vec3>>;

	meshes;
	lod = signal<Period>('month');

	autoLodEnabled = signal(true);

	flags: RendererFlags;

	constructor(
		ctx: ChartContext,
		provider: Provider,
		flags: RendererFlags,
	) {
		this.device = ctx.device;
		this.uniform = ctx.uniform;
		this.provider = provider;
		this.range = ctx.range;
		this.flags = flags;

		this.meshes = {
			'year': new OHLCV(ctx.device, ctx.uniform),
			'month': new OHLCV(ctx.device, ctx.uniform),
			'week': new OHLCV(ctx.device, ctx.uniform),
			'day': new OHLCV(ctx.device, ctx.uniform),
			'hour4': new OHLCV(ctx.device, ctx.uniform),
			'hour': new OHLCV(ctx.device, ctx.uniform),
			'minute5': new OHLCV(ctx.device, ctx.uniform),
			'minute': new OHLCV(ctx.device, ctx.uniform),
			'trade': new Trades(ctx.device, ctx.uniform),
		};
		Object.entries(this.meshes).forEach(([p, m]) => m.visible = p === this.lod.value);

		this.ticker.subscribe(ticker => {
			Object.values(this.meshes).forEach(m => m.nInstances = 0);
			// Even 100 years of daily aggs are only ~1MB.
			// Because of this, just cache everything that's daily or above.
			(['year', 'month', 'week', 'day'] as Exclude<Period, 'trade'>[]).forEach(period => {
				this.provider[period](ticker, minDate, new Date(), aggs => this.onAggs(period, aggs));
			});
			flags.rerender = true;
		});
		this.lod.subscribe((period: Period) => {
			Object.entries(this.meshes).forEach(([p, m]) => m.visible = p === period);
			flags.rerender = true;
		});
		ctx.autoLod.subscribe((newLod: Period) => {
			if (this.autoLodEnabled.value) this.lod.value = newLod;
		});
		effect(() => {
			if (lodKeys.indexOf(this.lod.value) >= lodKeys.indexOf('hour4')) this.fetchPage(ctx.eye.value);
		});
	}

	onAggs(lod: Exclude<Period, 'trade'>, data: Aggregate[]) {
		if (data.length == 0) return;

		this.meshes[lod].updateGeometry(data, lod);
		if (lod === 'year') this.range.value = toBounds(data, lod);
		if (lod === this.lod.value) this.flags.rerender = true;
	}

	onTrades(data: Trade[]) {
		if (data.length == 0) return;

		this.meshes.trade.updateGeometry(data);
		if ('trade' === this.lod.value) this.flags.rerender = true;
	}

	fetchPage(eye: Vec3) {
		const lodIndex = getLodIndex(eye.z);
		const lod = lodKeys[lodIndex];
		const period = lodKeys[Math.max(0, lodIndex - 1)];
		const ticker = this.ticker.value;

		const camDate = new Date(eye.x);
		let from = getNext(camDate, period, -100, true);
		let to = getNext(camDate, period, 100, true);
		const mesh = this.meshes[lod];

		if (!mesh.from || from < mesh.from || !mesh.to || to > mesh.to) {
			// Trust data will come...
			if (!mesh.from || from < mesh.from) mesh.from = new Date(from);
			if (!mesh.to || to > mesh.to) mesh.to = new Date(to);

			if (mesh.from && from < mesh.from) to = new Date(mesh.from);
			else if (mesh.to && to > mesh.to) from = new Date(mesh.to);

			if (lod === 'trade') this.provider.trade(ticker, from, to, data => this.onTrades(data));
			else this.provider[lod](ticker, from, to, data => this.onAggs(lod, data));
		}
	}

	render(pass: GPURenderPassEncoder): void {
		Object.values(this.meshes).forEach(m => m.render(pass));
	}

	toggleWireframe(): void {
		Object.values(this.meshes).forEach(m => m.toggleWireframe());
	}
}

