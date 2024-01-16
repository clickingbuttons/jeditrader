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

export interface Provider {
	year(ticker: string, from: Date, to: Date, onChunk: (aggs: Aggregate[]) => void): void;
	month(ticker: string, from: Date, to: Date, onChunk: (aggs: Aggregate[]) => void): void;
	week(ticker: string, from: Date, to: Date, onChunk: (aggs: Aggregate[]) => void): void;
	day(ticker: string, from: Date, to: Date, onChunk: (aggs: Aggregate[]) => void): void;
	hour4(ticker: string, from: Date, to: Date, onChunk: (aggs: Aggregate[]) => void): void;
	hour(ticker: string, from: Date, to: Date, onChunk: (aggs: Aggregate[]) => void): void;
	minute5(ticker: string, from: Date, to: Date, onChunk: (aggs: Aggregate[]) => void): void;
	minute(ticker: string, from: Date, to: Date, onChunk: (aggs: Aggregate[]) => void): void;
	second(ticker: string, from: Date, to: Date, onChunk: (aggs: Aggregate[]) => void): void;
	trade(ticker: string, from: Date, to: Date, onChunk: (trades: Trade[]) => void): void;
}
