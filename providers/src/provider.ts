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
	conditions?: number[];
}
export type Ticker = {
	ticker: string,
	name: string,
};

export interface Provider {
	tickers(like: string, limit: number): Promise<Ticker[]>;

	agg(
		ticker: string,
		startEpochNs: bigint,
		toEpochNs: bigint,
		duration: Duration,
		onChunk: (aggs: Aggregate[]) => void,
	): Promise<void>;
	trade(
		ticker: string,
		startEpochNs: bigint,
		toEpochNs: bigint,
		onChunk: (trades: Trade[]) => void,
	): Promise<void>;
}
