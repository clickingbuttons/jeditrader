import type { Duration } from './duration.js';

export type Aggregate = {
	epochNs: bigint;
	open: number;
	high: number;
	low: number;
	close: number;
	volume: number;
	vwap: number;
	count: number;
	// For intermediate vwap
	liquidity?: number;
}
export type Trade = {
	epochNs: bigint;
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
		startEpochNs: bigint,
		toEpochNs: bigint,
		duration: Duration,
		onChunk: (aggs: Aggregate[]) => void,
	): Promise<void>;

	tickers(like: string, limit: number): Promise<Ticker[]>;
	// trade(ticker: string, from: Date, to: Date): Stream<Trade[]>;
}
