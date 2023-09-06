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
export type Trade = {
	epochNS: number;
	price: number;
	size: number;
	conditions: number[];
}

export type Period = 'year' | 'month' | 'week' | 'day' | 'hour4' | 'hour' | 'minute5' | 'minute' | 'trade';
export interface Provider {
	year(ticker: string, from: Date, to: Date, onData: (aggs: Aggregate[]) => void): void;
	month(ticker: string, from: Date, to: Date, onData: (aggs: Aggregate[]) => void): void;
	week(ticker: string, from: Date, to: Date, onData: (aggs: Aggregate[]) => void): void;
	day(ticker: string, from: Date, to: Date, onData: (aggs: Aggregate[]) => void): void;
	hour4(ticker: string, from: Date, to: Date, onData: (aggs: Aggregate[]) => void): void;
	hour(ticker: string, from: Date, to: Date, onData: (aggs: Aggregate[]) => void): void;
	minute5(ticker: string, from: Date, to: Date, onData: (aggs: Aggregate[]) => void): void;
	minute(ticker: string, from: Date, to: Date, onData: (aggs: Aggregate[]) => void): void;
	trade(ticker: string, from: Date, to: Date, onData: (trades: Trade[]) => void): void;
}

// https://stackoverflow.com/questions/11526504/minimum-and-maximum-date
export const maxDate = new Date(8640000000000000);
export const minDate = new Date(-8640000000000000);

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

