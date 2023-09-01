import { isEqual } from 'date-fns';

export type Aggregate = {
	time: Date;
	open: number;
	high: number;
	low: number;
	close: number;
	volume: number;
	vwap: number;
}
export type Range<T> = {
	min: T;
	max: T;
}
export type AggRange = {
	[Property in keyof Aggregate]: Range<Aggregate[Property]>;
}
export interface AggResponse {
	aggs: Aggregate[],
	range: AggRange,
}
export type Period = 'year' | 'month' | 'week' | 'day' | 'hour' | 'minute';

export interface Provider {
	year(ticker: string, from: string, to: string): Promise<AggResponse>;
	month(ticker: string, from: string, to: string): Promise<AggResponse>;
	week(ticker: string, from: string, to: string): Promise<AggResponse>;
	day(ticker: string, from: string, to: string): Promise<AggResponse>;
	hour(ticker: string, from: string, to: string): Promise<AggResponse>;
	minute(ticker: string, from: string, to: string): Promise<AggResponse>;
}

/// Assumes `aggs` are ordered by time asc.
export function rollup(aggs: Aggregate[], toStartOfPeriod: (d: Date) => Date): Aggregate[] {
	const res = [] as Aggregate[];
	var liquidity = 0;
	for (var i = 0; i < aggs.length; i++) {
		const agg = aggs[i];
		const period = toStartOfPeriod(agg.time);
		const lastAgg = res[res.length - 1];
		const lastPeriod = lastAgg?.time;

		if (!isEqual(period, lastPeriod)) {
			res.push({ ...agg, time: period });
			liquidity = 0;
		} else {
			lastAgg.high = Math.max(lastAgg.high, agg.high);
			lastAgg.low = Math.min(lastAgg.low, agg.low);
			lastAgg.close = agg.close;
			lastAgg.volume += agg.volume;
			liquidity += lastAgg.vwap * lastAgg.volume;
			lastAgg.vwap = liquidity / lastAgg.volume;
		}
	}

	return res;
}

