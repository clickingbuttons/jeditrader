import { Aggregate, Provider, Ticker, Trade } from './provider.js';
import type { Duration, DurationUnit } from './duration.js';
import { clamp } from './helpers.js';

type Timespan = 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';

function toTimespan(d: DurationUnit): Timespan {
	switch (d) {
	case 'year': return 'year';
	case 'month': return 'month';
	case 'week': return 'week';
	case 'day': return 'day';
	case 'hour': return 'hour';
	case 'minute': return 'minute';
	case 'second':
	case 'millisecond':
	case 'microsecond':
	case 'nanosecond': return 'second';
	}
}

interface PolygonAgg {
	t: number;
	o: number;
	h: number;
	l: number;
	c: number;
	v: number;
	vw: number;
	n: number;
}

interface PolygonAggsResult {
	status: string;
	request_id: string;
	ticker?: string;
	queryCount?: number;
	resultsCount?: number;
	adjusted?: boolean;
	results?: PolygonAgg[];
	count?: number;
	next_url?: string;
}

interface PolygonTrade {
	sip_timestamp: number;
	size?: number;
	price?: number;
	conditions?: number[];
}

interface PolygonTradesResult {
	status: string;
	request_id: string;
	results?: PolygonTrade[];
	next_url?: string;
}

interface PolygonTicker {
	ticker: string;
	name: string;
	market: string;
	locale: string;
	primary_exchange: string;
	type: string;
	active: string;
	currency_name: string;
	cik: string;
	composite_figi: string;
	share_class_figi: string;
	last_updated_utc: string;
};

interface PolygonTickersResponse {
	status: string;
	request_id: string;
	results: PolygonTicker[];
	count?: number;
};

export class Polygon implements Provider {
	static baseUrl = 'https://api.polygon.io';
	static minDate = 0;
	static maxDate = new Date().setFullYear(new Date().getFullYear() + 1);

	constructor(
		public apiKey: string
	) {}

	static clamp(epochNs: bigint) {
		return clamp(Number(epochNs / 1_000_000n), Polygon.minDate, Polygon.maxDate);
	}

	async agg(
		ticker: string,
		startEpochNs: bigint,
		endEpochNs: bigint,
		duration: Duration,
		onChunk: (aggs: Aggregate[]) => void
	): Promise<void> {
		let fromMs = Polygon.clamp(startEpochNs);
		let toMs = Polygon.clamp(endEpochNs);

		const timespan = toTimespan(duration.unit);
		const url = `${Polygon.baseUrl}/v2/aggs/ticker/${ticker}/range/${duration.count}/${timespan}/${fromMs}/${toMs}?`;
		const urlExtra = `&apiKey=${this.apiKey}&limit=10000`;
		let resp: PolygonAggsResult = await fetch(url + urlExtra)
			.then(res => res.json());

		do {
			if (resp.results) {
				const aggs = resp.results.map(agg => ({
					epochNs: BigInt(agg.t) * 1_000_000n,
					open: agg.o,
					high: agg.h,
					low: agg.l,
					close: agg.c,
					volume: agg.v,
					vwap: agg.vw,
				}) as Aggregate);
				onChunk(aggs);
			}
			if (resp.next_url) {
				resp = await fetch(resp.next_url + urlExtra)
					.then(res => res.json())
			} else {
				return;
			}
		} while(resp.next_url);
	}

	async tickers(like: string, limit: number): Promise<Ticker[]> {
		const url = `${Polygon.baseUrl}/v3/reference/tickers?search=${like}&limit=${limit}&apiKey=${this.apiKey}`;
		let resp: PolygonTickersResponse = await fetch(url)
			.then(res => res.json());
		return resp.results;
	}

	// trade(ticker: string, from: Date, to: Date, onChunk: (trades: Trade[]) => void) {
	// 	if (from < polygonMinDate) from = polygonMinDate;

	// 	const apiKey = this.apiKey;
	// 	function handleResp(res: PolygonTradesResult) {
	// 		if (res.results) {
	// 			var trades: Trade[] = [];
	// 			var newTrade: Trade;
	// 			for (var i = 0; i < res.results.length; i++) {
	// 				var agg = res.results[i];
	// 				newTrade = {
	// 					epochNS: agg.sip_timestamp,
	// 					price: agg.price || 0,
	// 					size: agg.size || 0,
	// 					conditions: agg.conditions || [],
	// 				} as Trade;
	// 				trades.push(newTrade);
	// 			}
	// 			onChunk(trades);
	// 		}
	// 		if (res.next_url) {
	// 			fetch(res.next_url + `&apiKey=${apiKey}&limit=10000`)
	// 				.then(res => res.json() as Promise<PolygonTradesResult>)
	// 				.then(handleResp);
	// 		}
	// 	}

	// 	let url = `${Polygon.baseUrl}/v3/trades/${ticker}?timestamp.gte=${from.getTime() * 1e6}&timestamp.lte=${to.getTime() * 1e6}`;
	// 	fetch(url + `&apiKey=${this.apiKey}&limit=50000`)
	// 		.then(res => res.json())
	// 		.then(handleResp);
	// }
}
