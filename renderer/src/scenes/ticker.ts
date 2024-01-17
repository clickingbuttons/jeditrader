import type { Renderer } from '../renderer.js';
import { Provider, DurationUnit, Aggregate, Duration } from '@jeditrader/providers';
import { ChartScene } from './chart.js';
import { minDate, maxDate } from '../axis.js';

type AggDuration = 'years' | 'months' | 'weeks' | 'days' | 'hours' | 'minutes' | 'seconds';

function getFill(agg: Aggregate) {
	if (agg.close > agg.open) return 'green';
	else if (agg.close < agg.open) return 'red';
	return 'gray';
}

export class TickerScene extends ChartScene {
	minPxBetweenPoints = 4;
	aggs = {
		years: [],
		months: [],
		weeks: [],
		days: [],
		hours: [],
		minutes: [],
		seconds: [],
	} as { [k in AggDuration]: Aggregate[] };

	constructor(
		public renderer: Renderer,
		public ticker: string,
		public provider: Provider,
	) {
		super(renderer);
		const trivialDurations = [
			new Duration(1, 'years'),
			new Duration(1, 'months'),
		];
		trivialDurations.forEach(d =>
			this.provider.agg(
				this.ticker,
				new Date(minDate),
				new Date(maxDate),
				d,
				aggs => this.onChunk(aggs, d.unit as 'years' | 'months')
			)
		);
		// this.xAxis.ticks.subscribe(newTicks => {
		// 	const start = new Date(newTicks[0]);
		// 	const end = new Date(newTicks[newTicks.length - 1]);
		// 	const duration = Duration.fromInterval(start.getTime(), end.getTime());
		// 	console.log('aggs', start, end, duration);
		// 	this.provider.agg(this.ticker, start, end, duration, this.onChunk.bind(this));
		// });
	}

	onChunk(aggs: Aggregate[], duration: AggDuration) {
		this.aggs[duration].push(...aggs);
		this.renderer.flags.rerender = true;
	}

	render(ctx: CanvasRenderingContext2D, ctxUI: CanvasRenderingContext2D) {
		super.render(ctx, ctxUI);

		const xRange = this.xAxis.range.value;
		const yRange = this.yAxis.range.value;
		const xSpan = xRange.to - xRange.from;
		const ySpan = yRange.to - yRange.from;
		const axisWidth = this.xAxis.getPx();
		const axisHeight = this.yAxis.getPx();

		const aggDuration: AggDuration = 'years';
		const duration = new Duration(1, aggDuration);
		const widthPerc = duration.ms() / xSpan;
		const widthPx = axisWidth * widthPerc;

		for (let i = 0; i < this.aggs[aggDuration].length; i++) {
			const agg = this.aggs[aggDuration][i];
			const xPerc = (agg.time.getTime() - xRange.from) / xSpan;
			{
				const yPerc = 1 - (agg.high - yRange.from) / ySpan;
				const heightPerc = (agg.high - agg.low) / ySpan;
				ctx.fillStyle = 'black';
				ctx.fillRect(
					xPerc * axisWidth - 2,
					yPerc * axisHeight,
					2,
					heightPerc * axisHeight
				);
			}
			{
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
