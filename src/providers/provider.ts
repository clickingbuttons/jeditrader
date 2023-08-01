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
export type AggBounds = {
	[Property in keyof Aggregate]: Range<Aggregate[Property]>;
}
export interface AggResponse {
	aggs: Aggregate[],
	bounds: AggBounds,
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

