import { Duration, Provider, Aggregate, ms_to_nanos } from '@jeditrader/providers';
import { minDate, maxDate, toymd, clamp } from './helpers.js';
export type AggDuration = 'years' | 'months' | 'weeks' | 'days' | 'hours' | 'minutes' | 'seconds';

type Span<T> = {
	from: bigint,
	to: bigint,
	data: T[],
};

const minEpochNs = BigInt(minDate) * ms_to_nanos;
const maxEpochNs = BigInt(maxDate) * ms_to_nanos;

export class SpanCache {
	// Rule: no overlapping spans
	aggs = {} as { [k: string]: Span<Aggregate>[] };
	minAggFetchSize = 100n;

	constructor(
		public ticker: string,
		public provider: Provider,
	) {}

	clamp(epochNs: bigint) {
		return clamp(epochNs, minEpochNs, maxEpochNs);
	}

	*get(
		duration: Duration,
		from: bigint = minEpochNs,
		to: bigint = maxEpochNs
	): IterableIterator<Aggregate> {
		from = this.clamp(from);
		to = this.clamp(to);

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
					if (agg.epochNs >= from && agg.epochNs <= to) yield agg;
				}
			}
		}
	}

	async ensure(duration: Duration, from: bigint, to: bigint): Promise<void> {
		from = this.clamp(from);
		to = this.clamp(to);

		const key = duration.toString();
		this.aggs[key] ??= [];
		const spans = this.aggs[key];
		for (let i = 0; i < spans.length; i++) {
			if (from >= spans[i].from && to <= spans[i].to) return;
			if (from >= spans[i].from && from <= spans[i].to) from = spans[i].to;
			if (to >= spans[i].from && to <= spans[i].to) to = spans[i].from;
		}

		const duration_ns = BigInt(duration.ms()) * ms_to_nanos;
		const nExpected = (to - from) / duration_ns;
		const nMissing = this.minAggFetchSize - nExpected;
		if (nMissing > 0) {
			from = this.clamp(from - duration_ns * nMissing / 2n);
			to = this.clamp(to + duration_ns * nMissing / 2n);
		}

		const contained: Span<Aggregate>[] = [];
		for (let i = 0; i < spans.length; i++) {
			if (from >= spans[i].from && to <= spans[i].to) return;
			if (from >= spans[i].from && from <= spans[i].to) from = spans[i].to;
			if (to >= spans[i].from && to <= spans[i].to) to = spans[i].from;
			if (from <= spans[i].from && to >= spans[i].to) contained.push(spans[i]);
		}

		if (to - from < duration.ns() || from >= to) return;

		const promises: Promise<void>[] = [];
		for (let i = 0; i < contained.length + 1; i++) {
			const span: Span<Aggregate> = {
				from: i == 0 ? from : contained[i - 1].to,
				to: i == contained.length ? to : contained[i].from,
				data: []
			};
			this.aggs[key].push(span);
			console.log(
				'ensure',
				duration,
				toymd(new Date(Number(span.from / ms_to_nanos))),
				toymd(new Date(Number(span.to / ms_to_nanos))),
			);
			promises.push(
				this.provider.agg(
					this.ticker,
					span.from,
					span.to,
					duration,
					data => {
						for (let i = 0; i < data.length; i++) {
							if (data[i].epochNs >= span.from && data[i].epochNs < span.to) span.data.push(data[i]);
						}
					}
				)
			);
		}

		return Promise.all(promises).then(() => {});
	}
}
