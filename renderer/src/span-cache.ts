import { Duration, Provider, Aggregate, ms_to_nanos } from '@jeditrader/providers';
import { TimeRange } from './range/TimeRange.js';
import { minDate, maxDate, clamp } from './helpers.js';
export type AggDuration = 'years' | 'months' | 'weeks' | 'days' | 'hours' | 'minutes' | 'seconds';

type Span<T> = {
	from: bigint,
	to: bigint,
	data: T[],
	loading: boolean,
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

		const duration_ns = duration.ns();
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
		const newSpans: Span<Aggregate>[] = [];
		for (let i = 0; i < contained.length + 1; i++) {
			const span: Span<Aggregate> = {
				from: i == 0 ? from : contained[i - 1].to,
				to: i == contained.length ? to : contained[i].from,
				data: [],
				loading: true,
			};
			newSpans.push(span);
			this.aggs[key].push(span);
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

		return Promise.all(promises).then(() => {
			newSpans.forEach(s => s.loading = false);
		});
	}

	loadingSpans(duration: Duration) {
		return (this.aggs[duration.toString()] ?? []).filter(a => a.loading);
	}

	aggregate(from: Duration, lowerDurations: Duration[]) {
		const dailies = this.get(from);
		// Create higher level aggs from daily aggs.
		// This is needed because some sources misalign weeks, months, and years like Polygon
		const span = this.aggs[from.toString()][0];
		lowerDurations.forEach(duration => {
			this.aggs[duration.toString()] = [{
				from: span.from,
				to: span.to,
				data: [],
				loading: false,
			}];
		});

		for (let daily of dailies) {
			lowerDurations.forEach(duration => {
				const { start: aggStart } = new TimeRange(daily.epochNs, daily.epochNs).interval(duration);
				const aggs = this.aggs[duration.toString()][0].data;
				const lastStart = aggs[aggs.length - 1]?.epochNs;
				if (lastStart != aggStart) {
					aggs.push({
						epochNs: aggStart,
						open: daily.open,
						high: daily.high,
						low: daily.low,
						close: daily.close,
						volume: daily.volume,
						vwap: daily.vwap,
						count: daily.count,
						liquidity: daily.vwap * daily.volume,
					});
				} else {
					const agg = aggs[aggs.length - 1];
					if (daily.high > agg.high) agg.high = daily.high;
					if (daily.low < agg.low) agg.low = daily.low;
					agg.close = daily.close;
					agg.count += daily.count;
					agg.volume += daily.volume;
					agg.liquidity = (agg.liquidity ?? 0) + daily.vwap * daily.volume;
					agg.vwap = agg.liquidity / agg.volume;
				}
			});
		}
	}
}
