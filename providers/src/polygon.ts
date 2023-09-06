import { Aggregate, Period, Provider, Trade } from './provider.js';

const polygonMinDate = new Date(0);

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

	apiKey: string;

	constructor(apiKey: string) {
		this.apiKey = apiKey;
	}

	private agg(
		ticker: string,
		multiplier: number,
		period: Period,
		from: Date,
		to: Date,
		onData: (aggs: Aggregate[]) => void
	) {
		if (from < polygonMinDate) from = polygonMinDate;

		const apiKey = this.apiKey;
		function handleResp(res: PolygonAggsResult) {
			if (res.results) {
				var aggs: Aggregate[] = [];
				var newAgg: Aggregate;
				for (var i = 0; i < res.results.length; i++) {
					var agg = res.results[i];
					newAgg = {
						time: new Date(agg.t),
						open: agg.o,
						high: agg.h,
						low: agg.l,
						close: agg.c,
						volume: agg.v,
						vwap: agg.vw,
					} as Aggregate;
					aggs.push(newAgg);
				}
				onData(aggs);
			}
			if (res.next_url) {
				fetch(res.next_url + `&apiKey=${apiKey}&limit=10000`)
					.then(res => res.json() as Promise<PolygonAggsResult>)
					.then(handleResp);
			}
		}

		let url = `${Polygon.aggsUrl}/${ticker}/range/${multiplier}/${period}/${from.getTime()}/${to.getTime()}?`;
		fetch(url + `&apiKey=${this.apiKey}&limit=10000`)
				.then(res => res.json())
				.then(handleResp);
	}

	year(ticker: string, from: Date, to: Date, onData: (aggs: Aggregate[]) => void) {
		return this.agg(ticker, 1, 'year', from, to, onData);
	}

	month(ticker: string, from: Date, to: Date, onData: (aggs: Aggregate[]) => void) {
		return this.agg(ticker, 1, 'month', from, to, onData);
	}

	week(ticker: string, from: Date, to: Date, onData: (aggs: Aggregate[]) => void) {
		return this.agg(ticker, 1, 'week', from, to, onData);
	}

	day(ticker: string, from: Date, to: Date, onData: (aggs: Aggregate[]) => void) {
		return this.agg(ticker, 1, 'day', from, to, onData);
	}

	hour4(ticker: string, from: Date, to: Date, onData: (aggs: Aggregate[]) => void) {
		return this.agg(ticker, 4, 'hour', from, to, onData);
	}

	hour(ticker: string, from: Date, to: Date, onData: (aggs: Aggregate[]) => void) {
		return this.agg(ticker, 1, 'hour', from, to, onData);
	}

	minute5(ticker: string, from: Date, to: Date, onData: (aggs: Aggregate[]) => void) {
		return this.agg(ticker, 5, 'minute', from, to, onData);
	}

	minute(ticker: string, from: Date, to: Date, onData: (aggs: Aggregate[]) => void) {
		return this.agg(ticker, 1, 'minute', from, to, onData);
	}

	trade(ticker: string, from: Date, to: Date, onData: (trades: Trade[]) => void) {
		if (from < polygonMinDate) from = polygonMinDate;

		const apiKey = this.apiKey;
		function handleResp(res: PolygonTradesResult) {
			if (res.results) {
				var trades: Trade[] = [];
				var newTrade: Trade;
				for (var i = 0; i < res.results.length; i++) {
					var agg = res.results[i];
					newTrade = {
						epochNS: agg.sip_timestamp,
						price: agg.price || 0,
						size: agg.size || 0,
						conditions: agg.conditions || [],
					} as Trade;
					trades.push(newTrade);
				}
				onData(trades);
			}
			if (res.next_url) {
				fetch(res.next_url + `&apiKey=${apiKey}&limit=10000`)
					.then(res => res.json() as Promise<PolygonTradesResult>)
					.then(handleResp);
			}
		}

		let url = `${Polygon.baseUrl}/v3/trades/${ticker}?timestamp.gte=${from.getTime() * 1e6}&timestamp.lte=${to.getTime() * 1e6}`;
		fetch(url + `&apiKey=${this.apiKey}&limit=50000`)
				.then(res => res.json())
				.then(handleResp);
	}
}
