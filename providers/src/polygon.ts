import { Aggregate, Provider, Trade } from './provider.js';
import type { Duration, DurationUnit } from './duration.js';

type Timespan = 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';

function toTimespan(d: DurationUnit): Timespan {
	switch (d) {
	case 'years': return 'year';
	case 'months': return 'month';
	case 'weeks': return 'week';
	case 'days': return 'day';
	case 'hours': return 'hour';
	case 'minutes': return 'minute';
	case 'seconds':
	case 'milliseconds': return 'second';
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

export class Polygon implements Provider {
	static baseUrl = 'https://api.polygon.io';
	static aggsUrl = `${Polygon.baseUrl}/v2/aggs/ticker`;
	static minDate = new Date(0);

	constructor(
		public apiKey: string
	) {}

	async agg(
		ticker: string,
		from: Date,
		to: Date,
		duration: Duration,
		onChunk: (aggs: Aggregate[]) => void
	): Promise<void> {
		const timespan = toTimespan(duration.unit);
		if (from < Polygon.minDate) from = Polygon.minDate;

		const url = `${Polygon.aggsUrl}/${ticker}/range/${duration.count}/${timespan}/${from.getTime()}/${to.getTime()}?`;
		const urlExtra = `&apiKey=${this.apiKey}&limit=10000`;
		let resp: PolygonAggsResult = await fetch(url + urlExtra)
			.then(res => res.json());

		do {
			if (resp.results) {
				const aggs = resp.results.map(agg => ({
					time: agg.t,
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
