import { Aggregate, AggResponse, AggBounds, Period } from './provider';

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

export class Polygon {
	static baseUrl = 'https://api.polygon.io';
	static aggsUrl = `${Polygon.baseUrl}/v2/aggs/ticker`;

	apiKey: string;

	constructor(apiKey: string) {
		this.apiKey = apiKey;
	}

	// TODO: handle next_url
	private async agg(ticker: string, period: Period, from: string, to: string): Promise<AggResponse> {
		return fetch(`${Polygon.aggsUrl}/${ticker}/range/1/${period}/${from}/${to}?apiKey=${this.apiKey}&limit=10000`)
			.then(res => res.json())
			.then(res => res.results as PolygonAgg[])
			.then(res => {
				var aggs: Aggregate[] = [];
				var newAgg: Aggregate;
				var bounds = {
					time: { min: maxDate, max: minDate },
					open: { min: Number.MAX_VALUE, max: Number.MIN_VALUE },
					high: { min: Number.MAX_VALUE, max: Number.MIN_VALUE },
					low: { min: Number.MAX_VALUE, max: Number.MIN_VALUE },
					close: { min: Number.MAX_VALUE, max: Number.MIN_VALUE },
					volume: { min: Number.MAX_VALUE, max: Number.MIN_VALUE },
					vwap: { min: Number.MAX_VALUE, max: Number.MIN_VALUE },
				} as AggBounds;
				const keys = Object.keys(bounds) as (keyof typeof bounds)[];
				function updateBound(prop: keyof typeof bounds) {
					if (newAgg[prop] < bounds[prop].min) bounds[prop].min = newAgg[prop];
					if (newAgg[prop] > bounds[prop].max) bounds[prop].max = newAgg[prop];
				}
				for (var i = 0; i < res.length; i++) {
					var agg = res[i];
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
					for (var j = 0; j < keys.length; j++) updateBound(keys[j]);
				}

				return { aggs, bounds };
			});
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
