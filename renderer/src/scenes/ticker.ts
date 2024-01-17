import type { Renderer } from '../renderer.js';
import { signal } from '@preact/signals-core';
import { Provider, Aggregate, Duration } from '@jeditrader/providers';
import { ChartScene } from './chart.js';
import { lods } from '../axis.js';
import { getVar, minDate, maxDate } from '../helpers.js';
import { SpanCache } from '../span-cache.js';

function getFill(agg: Aggregate) {
	if (agg.close > agg.open) return 'green';
	else if (agg.close < agg.open) return 'red';
	return 'gray';
}

export class TickerScene extends ChartScene {
	minPxBetweenPoints = 4;
	duration = signal(new Duration(1, 'years'));
	cache: SpanCache;

	constructor(
		renderer: Renderer,
		public ticker: string,
		public provider: Provider,
	) {
		super(renderer);
		this.cache = new SpanCache(ticker, provider);
		const rerender = () => renderer.flags.rerender = true

		lods
			.map(l => l.step)
			.filter(d => d.ms() >= new Duration(1, 'months').ms())
			.forEach(d =>
				this.cache.ensure(d, minDate, maxDate)
					.then(() => this.duration.value.eq(d) && rerender())
			);

		this.xAxis.ticks.subscribe(newTicks => {
			const start = newTicks[0];
			const end = newTicks[newTicks.length - 1];
			const axisLod = this.xAxis.duration.value;
			const axisLodIndex = lods.findIndex(l => l.step.unit == axisLod.unit && l.step.count == axisLod.count);
			let dataLod = lods[Math.min(axisLodIndex + 1, lods.length - 1)].step.clone();
			if (dataLod.unit === 'milliseconds') dataLod = new Duration(1, 'seconds');
			this.cache.ensure(dataLod, start, end).then(rerender);
			this.duration.value = dataLod;
		});
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
		const aggs = this.cache.get(aggDuration, start, end);

		for (let agg of aggs) {
			const xPerc = (agg.time - xRange.from) / xSpan + widthPerc / 2;
			if (xPerc < -widthPerc || xPerc > 1 + widthPerc) continue;
			{
				const yPerc = 1 - (agg.high - yRange.from) / ySpan;
				const heightPerc = (agg.high - agg.low) / ySpan;
				ctx.fillStyle = `rgb(${getVar('--fg') ?? '0, 0, 0'})`;
				ctx.fillRect(
					xPerc * axisWidth - 1,
					yPerc * axisHeight,
					3,
					heightPerc * axisHeight
				);
			}
			{
				const widthPx = axisWidth * widthPerc;
				const yPerc = 1 - (agg.open - yRange.from) / ySpan;
				const heightPerc = (agg.open - agg.close) / ySpan;
				ctx.fillStyle = getFill(agg);
				ctx.fillRect(
					xPerc * axisWidth - widthPx / 2 + 2,
					yPerc * axisHeight,
					widthPx - 2,
					heightPerc * axisHeight
				);
			}
		}
	}
};
