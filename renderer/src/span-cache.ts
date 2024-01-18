import { Duration, Provider, Aggregate } from '@jeditrader/providers';
import { minDate, maxDate, toymd } from './helpers.js';
export type AggDuration = 'years' | 'months' | 'weeks' | 'days' | 'hours' | 'minutes' | 'seconds';

type Span<T> = {
	from: number,
	to: number,
	data: T[],
};

export class SpanCache {
	// Rule: no overlapping spans
	aggs = {} as { [k: string]: Span<Aggregate>[] };
	minAggFetchSize = 100;

	min = minDate;
	max = maxDate;

	constructor(
		public ticker: string,
		public provider: Provider,
	) {}

	*get(duration: Duration, from: number, to: number): Iterable<Aggregate> {
		if (from < this.min) from = this.min;
		if (to > this.max) to = this.max;

		const spans = this.aggs[duration.toString()] ?? [];
		for (let i = 0; i < spans.length; i++) {
			const span = spans[i];
			if (
				(from >= span.from && from <= span.to) ||
				(to >= span.from && to <= span.to) ||
				(from <= span.from && to >= span.to)
			) {
				const firstIndex = 0; // binarySearch(span.data, agg => agg.time <= from);
				const lastIndex = span.data.length; // binarySearch(span.data, agg => agg.time < to);
				for (let j = firstIndex; j < lastIndex; j++) {
					const agg = span.data[j];
					const ms = new Date(agg.time).getTime();
					if (ms >= from && ms <= to) yield agg;
				}
			}
		}
	}

	async ensure(duration: Duration, from: number, to: number): Promise<void> {
		if (from < this.min) from = this.min;
		if (to > this.max) to = this.max;

		const key = duration.toString();
		this.aggs[key] ??= [];
		const spans = this.aggs[key];
		for (let i = 0; i < spans.length; i++) {
			if (from >= spans[i].from && to <= spans[i].to) return;
			if (from >= spans[i].from && from <= spans[i].to) from = spans[i].to;
			if (to >= spans[i].from && to <= spans[i].to) to = spans[i].from;
		}

		const nExpected = (to - from) / duration.ms();
		const nMissing = this.minAggFetchSize - nExpected;
		if (nMissing > 0) {
			from -= duration.ms() * nMissing / 2;
			to += duration.ms() * nMissing / 2;
			if (from < this.min) from = this.min;
			if (to > this.max) to = this.max;
		}

		const contained: Span<Aggregate>[] = [];
		for (let i = 0; i < spans.length; i++) {
			if (from >= spans[i].from && to <= spans[i].to) return;
			if (from >= spans[i].from && from <= spans[i].to) from = spans[i].to;
			if (to >= spans[i].from && to <= spans[i].to) to = spans[i].from;
			if (from <= spans[i].from && to >= spans[i].to) contained.push(spans[i]);
		}

		if (to - from < duration.ms()) return;

		const promises: Promise<void>[] = [];
		for (let i = 0; i < contained.length + 1; i++) {
			const span: Span<Aggregate> = {
				from: i == 0 ? from : contained[i - 1].to,
				to: i == contained.length ? to : contained[i].from,
				data: []
			};
			this.aggs[key].push(span);
			console.log('ensure', duration, toymd(new Date(span.from)), toymd(new Date(span.to)));
			promises.push(
				this.provider.agg(
					this.ticker,
					new Date(span.from),
					new Date(span.to),
					duration,
					data => {
						for (let i = 0; i < data.length; i++) {
							if (data[i].time >= span.from && data[i].time < span.to) span.data.push(data[i]);
						}
					}
				)
			);
		}

		return Promise.all(promises).then(() => {});
	}
}
