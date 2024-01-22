import type { Duration } from './duration.js';

export type Aggregate = {
	/// epoch ms
	time: number;
	open: number;
	high: number;
	low: number;
	close: number;
	volume: number;
	vwap: number;
	count: number;
}
export type Trade = {
	epochNS: number;
	price: number;
	size: number;
	conditions: number[];
}
export type Ticker = {
	ticker: string,
	name: string,
};

export interface Provider {
	agg(
		ticker: string,
		from: Date,
		to: Date,
		duration: Duration,
		onChunk: (aggs: Aggregate[]) => void,
	): Promise<void>;

	tickers(like: string, limit: number): Promise<Ticker[]>;
	// trade(ticker: string, from: Date, to: Date): Stream<Trade[]>;
}
