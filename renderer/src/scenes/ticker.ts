import type { Renderer } from '../renderer.js';
import { signal } from '@preact/signals-core';
import { Provider, Aggregate, Duration } from '@jeditrader/providers';
import { ChartScene } from './chart.js';
import { lods } from '../lods.js';
import { getVar, minDate, maxDate } from '../helpers.js';
import { SpanCache } from '../span-cache.js';
import { TimeRange, NumberRange }  from '../range/index.js';
import { Signal } from '@preact/signals-core';

export class TickerScene extends ChartScene {
	minPxBetweenPoints = 4;
	duration = signal(new Duration(1, 'year'));
	cache: SpanCache;

	settings = {
		bar: {
			wickWidth: signal(3),
			wickColor: {
				val: signal('foreground'),
				options: ['foreground', 'body'],
			}
		}
	};

	crosshair = signal<Aggregate | undefined>(undefined);

	constructor(
		renderer: Renderer,
		public ticker: string,
		public provider: Provider,
	) {
		super(renderer);
		this.cache = new SpanCache(ticker, provider);
		this.xAxis.crosshairDuration = this.duration;
		const rerender = () => renderer.flags.rerender = true;

		// Dailes are small and fine to load all of.
		const allTime = new TimeRange(minDate, maxDate);
		const daily = new Duration(1, 'day');
		const { start, end } = allTime.interval(daily);
		const lowLodDurations = lods.map(l => l.step).filter(d => d.ms() > daily.ms());
		this.cache.ensure(daily, start, end).then(() => {
			this.cache.aggregate(daily, lowLodDurations);
			this.fit();
		});
		this.cache.loadingSpans(daily).forEach(s => {
			// TODO: loading animation
		});

		(this.xAxis.range as Signal<TimeRange>).subscribe(newRange => {
			const axisLod = this.xAxis.step.value as Duration;
			const axisLodIndex = lods.findIndex(l => l.step.unit == axisLod.unit && l.step.count == axisLod.count);
			const dataLod = lods[Math.min(axisLodIndex + 2, lods.length - 1)].step.clone();

			const bufferNs = dataLod.ns() * 20n;
			const interval = new TimeRange(newRange.start - bufferNs, newRange.end + bufferNs).interval(dataLod);

			if (dataLod.ms() < daily.ms()) this.cache.ensure(dataLod, interval.start, interval.end).then(rerender);
			this.duration.value = dataLod;
		});

		this.xAxis.crosshairPx.subscribe(newCrosshair => {
			if (!newCrosshair) {
				this.crosshair.value = undefined;
				return;
			}
			const axisVal = this.xAxis.rangeValue(newCrosshair) as bigint;

			const { start, end } = new TimeRange(axisVal, axisVal).interval(this.duration.value);
			const iter = this.cache.get(this.duration.value, start, end - 1n);
			const first = iter.next().value;
			if (first) this.crosshair.value = first;
			else this.crosshair.value = undefined;
		});

		this.settings.bar.wickColor.val.subscribe(rerender);
		this.settings.bar.wickWidth.subscribe(rerender);
	}

	fit() {
		// Set axis range based on data
		const duration = this.duration.value;
		const timeRange = new TimeRange(maxDate, minDate);
		const priceRange = new NumberRange(Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, '$');
		const aggs = this.cache.get(duration);
		const d_ns = duration.ns();
		for (let agg of aggs) {
			if (agg.epochNs < timeRange.start) timeRange.start = agg.epochNs;
			if (agg.epochNs + d_ns > timeRange.end) timeRange.end = agg.epochNs + d_ns;

			if (agg.low < priceRange.start) priceRange.start = agg.low;
			if (agg.high > priceRange.end) priceRange.end = agg.high;
		}
		timeRange.start -= d_ns;
		timeRange.end += d_ns;
		this.xAxis.range.value = timeRange;
		this.yAxis.range.value = priceRange;
	}

	getFill(agg: Aggregate) {
		let rgb = getVar('--bar-even-color');
		if (agg.close > agg.open) rgb = getVar('--bar-up-color');
		else if (agg.close < agg.open) rgb = getVar('--bar-down-color');
		return `rgb(${rgb})`;
	}

	render(ctx: CanvasRenderingContext2D, ctxUI: CanvasRenderingContext2D) {
		super.render(ctx, ctxUI);

		const xRange = this.xAxis.range.value as TimeRange;
		const yRange = this.yAxis.range.value as NumberRange;
		const xSpan = Number(xRange.end - xRange.start);
		const ySpan = yRange.end - yRange.start;
		const axisWidth = this.xAxis.getPx();
		const axisHeight = this.yAxis.getPx();

		const aggDuration = this.duration.value;
		const duration_ns = this.duration.value.ns();
		const widthPerc = Number(duration_ns) / xSpan;

		const start = xRange.start - duration_ns;
		const end = xRange.end + duration_ns;
		const wickWidth = this.settings.bar.wickWidth.value;
		const barWidth = axisWidth * widthPerc;

		const aggs = this.cache.get(aggDuration, start, end);
		for (let agg of aggs) {
			const xPerc = Number(agg.epochNs - xRange.start) / xSpan + widthPerc / 2;
			if (xPerc < -widthPerc || xPerc > 1 + widthPerc) continue;
			// if (agg.volume * agg.vwap) {
			// 	// shadow
			// 	const yPerc = 1 - (Math.min(agg.open, agg.close) - yRange.from) / ySpan;
			// 	const heightPerc = (agg.volume * agg.vwap / 1e7) / ySpan;

			// 	const x = xPerc * axisWidth;
			// 	const y = yPerc * axisHeight;
			// 	// const gradient = ctx.createRadialGradient(x, y, 0, x, y, heightPerc * axisHeight);

			// 	// Add three color stops
			// 	// gradient.addColorStop(0, "black");
			// 	// gradient.addColorStop(1, "transparent");
			// 	ctx.fillStyle = `rgb(${getVar('--bar-shadow-color')})`;
			// 	ctx.fillRect(x - barWidth / 2, y, barWidth, heightPerc * axisHeight);
			// }
			{
				// wick
				const yPerc = 1 - (agg.high - yRange.start) / ySpan;
				const heightPerc = (agg.high - agg.low) / ySpan;
				if (this.settings.bar.wickColor.val.value === 'foreground') {
					ctx.fillStyle = `rgb(${getVar('--fg') ?? '0, 0, 0'})`;
				} else {
					ctx.fillStyle = this.getFill(agg);
				}
				ctx.fillRect(
					xPerc * axisWidth - (wickWidth - 1) / 2,
					yPerc * axisHeight,
					wickWidth,
					heightPerc * axisHeight
				);
			}
			{
				// candle
				const yPerc = 1 - (agg.open - yRange.start) / ySpan;
				const heightPerc = (agg.open - agg.close) / ySpan;
				ctx.fillStyle = this.getFill(agg);
				let height = heightPerc * axisHeight;
				if (height >= 0 && height < 1) height = 1;
				if (height < 0 && height > -1) height = -1;

				ctx.save();
				ctx.shadowBlur = 4;
				ctx.shadowColor = 'black';
				ctx.fillRect(
					xPerc * axisWidth - barWidth / 2,
					yPerc * axisHeight,
					barWidth,
					height
				);
				ctx.restore();
			}
		}
	}
};
