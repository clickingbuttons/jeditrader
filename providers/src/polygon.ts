import { Aggregate, AggResponse, AggRange, Period } from './provider.js';

// https://stackoverflow.com/questions/11526504/minimum-and-maximum-date
const maxDate = new Date(8640000000000000);
const minDate = new Date(-8640000000000000);

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
	ticker: string;
	queryCount: number;
	resultsCount: number;
	adjusted: boolean;
	results: PolygonAgg[];
	status: string;
	request_id: string;
	count: number;
	next_url?: string;
}

export class Polygon {
	static baseUrl = 'https://api.polygon.io';
	static aggsUrl = `${Polygon.baseUrl}/v2/aggs/ticker`;

	apiKey: string;

	constructor(apiKey: string) {
		this.apiKey = apiKey;
	}

	private async agg(
		ticker: string,
		period: Period,
		from: string,
		to: string
	): Promise<AggResponse> {
		const allResults: PolygonAgg[] = [];

		let url: string | undefined = `${Polygon.aggsUrl}/${ticker}/range/1/${period}/${from}/${to}?`;
		while (url) {
			url = await fetch(url + `&apiKey=${this.apiKey}&limit=10000`)
				.then(res => res.json() as Promise<PolygonAggsResult>)
				.then(res => {
					allResults.push(...res.results);
					return res.next_url;
				});
		}

		var aggs: Aggregate[] = [];
		var newAgg: Aggregate;
		var range = {
			time: { min: maxDate, max: minDate },
			open: { min: Number.MAX_VALUE, max: Number.MIN_VALUE },
			high: { min: Number.MAX_VALUE, max: Number.MIN_VALUE },
			low: { min: Number.MAX_VALUE, max: Number.MIN_VALUE },
			close: { min: Number.MAX_VALUE, max: Number.MIN_VALUE },
			volume: { min: Number.MAX_VALUE, max: Number.MIN_VALUE },
			vwap: { min: Number.MAX_VALUE, max: Number.MIN_VALUE },
		} as AggRange;
		const keys = Object.keys(range) as (keyof typeof range)[];
		function updateRange(prop: keyof typeof range) {
			if (newAgg[prop] < range[prop].min) range[prop].min = newAgg[prop];
			if (newAgg[prop] > range[prop].max) range[prop].max = newAgg[prop];
		}
		for (var i = 0; i < allResults.length; i++) {
			var agg = allResults[i];
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
			for (var j = 0; j < keys.length; j++) updateRange(keys[j]);
		}

		return { aggs, range };
	}

	async year(ticker: string, from: string, to: string): Promise<AggResponse> {
		return this.agg(ticker, 'year', from, to);
	}

	async month(ticker: string, from: string, to: string): Promise<AggResponse> {
		return this.agg(ticker, 'month', from, to);
	}

	async week(ticker: string, from: string, to: string): Promise<AggResponse> {
		return this.agg(ticker, 'week', from, to);
	}

	async day(ticker: string, from: string, to: string): Promise<AggResponse> {
		return this.agg(ticker, 'day', from, to);
	}

	async hour(ticker: string, from: string, to: string): Promise<AggResponse> {
		return this.agg(ticker, 'hour', from, to);
	}

	async minute(ticker: string, from: string, to: string): Promise<AggResponse> {
		return this.agg(ticker, 'minute', from, to);
	}
}
