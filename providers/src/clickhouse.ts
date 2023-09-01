import { Aggregate, AggResponse, AggRange } from './provider.js';

// https://stackoverflow.com/questions/11526504/minimum-and-maximum-date
const maxDate = new Date(8640000000000000);
const minDate = new Date(-8640000000000000);
const periodMap = {
	'minute': 'agg1m',
	'hour': 'agg1h',
	'day': 'agg1d',
	'week': 'agg1w',
	'month': 'agg1mo',
	'year': 'agg1y',
};

export type ClickhouseAggregate = {
	time: number;
	open: number;
	high: number;
	low: number;
	close: number;
	volume: number;
	vwap: number;
}

export class Clickhouse {
	url: string;

	constructor(url: string) {
		this.url = url;
	}

	// TODO: handle next_url
	private async agg(
		ticker: string,
		period: keyof typeof periodMap,
		from: string,
		to: string
	): Promise<AggResponse> {
		const query = `SELECT toUnixTimestamp(ts) as time,
				open,
				high,
				low,
				close,
				toFloat64(volume) as volume,
				vwap
			 FROM us_equities.${periodMap[period]}
			 WHERE ticker='${ticker}' AND ts BETWEEN '${from}' AND '${to}'
			 ORDER BY ts
			 FORMAT JSON
		`;
		return fetch(`${this.url}/?query=${query}&add_http_cors_header=1`)
			.then(res => res.json())
			.then(res => res.data as ClickhouseAggregate[])
			.then(res => {
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
				for (var i = 0; i < res.length; i++) {
					var agg = res[i];
					newAgg = {
						...agg,
						time: new Date(agg.time * 1000),
					} as Aggregate;
					aggs.push(newAgg);
					for (var j = 0; j < keys.length; j++) updateRange(keys[j]);
				}

				return { aggs, range };
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
