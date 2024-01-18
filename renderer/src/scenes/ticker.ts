import type { Renderer } from '../renderer.js';
import { signal } from '@preact/signals-core';
import { Provider, Aggregate, Duration } from '@jeditrader/providers';
import { ChartScene } from './chart.js';
import { lods, lowLods, getInterval } from '../axis.js';
import { getVar, minDate, maxDate } from '../helpers.js';
import { SpanCache } from '../span-cache.js';

export class TickerScene extends ChartScene {
	minPxBetweenPoints = 4;
	duration = signal(new Duration(1, 'years'));
	cache: SpanCache;

	settings = {
		bar: {
			colors: {
				up: signal('green'),
				down: signal('red'),
				even: signal('gray'),
			},
			wickWidth: signal(3),
		}
	};

	constructor(
		renderer: Renderer,
		public ticker: string,
		public provider: Provider,
	) {
		super(renderer);
		this.cache = new SpanCache(ticker, provider);
		const rerender = () => renderer.flags.rerender = true

		// These are small and fine to load all of
		lowLods.map(l => l.step).forEach(d => {
			this.cache.ensure(d, minDate, maxDate).then(() => {
				if (!this.duration.value.eq(d)) return;

				// Set axis range based on data
				const timeRange = { from: maxDate, to: minDate };
				const priceRange = { from: Number.POSITIVE_INFINITY, to: Number.NEGATIVE_INFINITY };
				const aggs = this.cache.get(d);
				for (let agg of aggs) {
					if (agg.time < timeRange.from) timeRange.from = agg.time;
					if (agg.time > timeRange.to) timeRange.to = agg.time;

					if (agg.low < priceRange.from) priceRange.from = agg.low;
					if (agg.high > priceRange.to) priceRange.to = agg.high;
				}
				this.xAxis.range.value = { ...timeRange };
				this.yAxis.range.value = { ...priceRange };
			})
		});

		this.xAxis.range.subscribe(newRange => {
			const axisLod = this.xAxis.duration.value;
			const axisLodIndex = lods.findIndex(l => l.step.unit == axisLod.unit && l.step.count == axisLod.count);

			let dataLod = lods[Math.min(axisLodIndex + 2, lods.length - 1)].step.clone();
			if (dataLod.unit === 'milliseconds') dataLod = new Duration(1, 'seconds');

			const bufferMs = dataLod.ms() * 20;
			const start = newRange.from - bufferMs;
			const end = newRange.to + bufferMs;
			const interval = getInterval(start, end, dataLod);

			this.cache.ensure(dataLod, interval.start, interval.end).then(rerender);
			this.duration.value = dataLod;
		});

		Object.values(this.settings.bar.colors).forEach(v => v.subscribe(rerender));
		this.settings.bar.wickWidth.subscribe(rerender);
	}

	getFill(agg: Aggregate) {
		const { colors } = this.settings.bar;
		if (agg.close > agg.open) return colors.up.value;
		else if (agg.close < agg.open) return colors.down.value;
		return colors.even.value;
	}

	render(ctx: CanvasRenderingContext2D, ctxUI: CanvasRenderingContext2D) {
		super.render(ctx, ctxUI);

		const xRange = this.xAxis.range.value;
		const yRange = this.yAxis.range.value;
		const xSpan = xRange.to - xRange.from;
		const ySpan = yRange.to - yRange.from;
		const axisWidth = this.xAxis.getPx();
		const axisHeight = this.yAxis.getPx();

		const aggDuration = this.duration.value;
		const widthPerc = this.duration.value.ms() / xSpan;

		const ticks = this.xAxis.ticks.value;
		const start = ticks[0];
		const end = ticks[ticks.length - 1];
		const wickWidth = this.settings.bar.wickWidth.value;

		const aggs = this.cache.get(aggDuration, start, end);
		for (let agg of aggs) {
			const xPerc = (agg.time - xRange.from) / xSpan + widthPerc / 2;
			if (xPerc < -widthPerc || xPerc > 1 + widthPerc) continue;
			{
				// wick
				const yPerc = 1 - (agg.high - yRange.from) / ySpan;
				const heightPerc = (agg.high - agg.low) / ySpan;
				ctx.fillStyle = `rgb(${getVar('--fg') ?? '0, 0, 0'})`;
				ctx.fillRect(
					xPerc * axisWidth - (wickWidth - 1) / 2,
					yPerc * axisHeight,
					wickWidth,
					heightPerc * axisHeight
				);
			}
			{
				// candle
				const widthPx = axisWidth * widthPerc;
				const yPerc = 1 - (agg.open - yRange.from) / ySpan;
				const heightPerc = (agg.open - agg.close) / ySpan;
				ctx.fillStyle = this.getFill(agg);

				let height = heightPerc * axisHeight;
				if (height >= 0 && height < 1) height = 1;
				if (height < 0 && height > -1) height = -1;
				ctx.fillRect(
					xPerc * axisWidth - widthPx / 2,
					yPerc * axisHeight,
					widthPx,
					height
				);
			}
		}
	}
};
