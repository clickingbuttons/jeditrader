import { Aggregate, Period, Provider } from './provider.js';

const periodMap = {
	'minute': 'agg1m',
	'minute5': 'agg5m',
	'hour': 'agg1h',
	'hour4': 'agg4h',
	'day': 'agg1d',
	'week': 'agg1w',
	'month': 'agg1mo',
	'year': 'agg1y',
} as { [p in Period]: string };
const clickhouseMinDate = new Date(0);

type ClickhouseAggregate = {
	time: number;
	open: number;
	high: number;
	low: number;
	close: number;
	volume: number;
	vwap: number;
}

export class Clickhouse implements Provider {
	url: string;

	constructor(url: string) {
		this.url = url;
	}

	private agg(
		ticker: string,
		period: Period,
		from: Date,
		to: Date,
		onData: (aggs: Aggregate[]) => void
	) {
		if (from < clickhouseMinDate) from = clickhouseMinDate;
		const query = `SELECT toUnixTimestamp(ts) as time,
				open,
				high,
				low,
				close,
				toFloat64(volume) as volume,
				vwap
			 FROM us_equities.${periodMap[period]}
			 WHERE ticker='${ticker}' AND ts BETWEEN toDateTime(${from.getTime() / 1e3}) AND toDateTime(${to.getTime() / 1e3})
			 ORDER BY ts
			 FORMAT JSON
		`;

		fetch(`${this.url}/?query=${query}&add_http_cors_header=1`)
			.then(res => res.json())
			.then(res => res.data as ClickhouseAggregate[])
			.then(res => {
				var aggs: Aggregate[] = [];
				var newAgg: Aggregate;
				for (var i = 0; i < res.length; i++) {
					var agg = res[i];
					newAgg = {
						...agg,
						time: new Date(agg.time * 1000),
					} as Aggregate;
					aggs.push(newAgg);
				}
				onData(aggs);
			});
	}

	year(ticker: string, from: Date, to: Date, onData: (aggs: Aggregate[]) => void) {
		return this.agg(ticker, 'year', from, to, onData);
	}

	month(ticker: string, from: Date, to: Date, onData: (aggs: Aggregate[]) => void) {
		return this.agg(ticker, 'month', from, to, onData);
	}

	week(ticker: string, from: Date, to: Date, onData: (aggs: Aggregate[]) => void) {
		return this.agg(ticker, 'week', from, to, onData);
	}

	day(ticker: string, from: Date, to: Date, onData: (aggs: Aggregate[]) => void) {
		return this.agg(ticker, 'day', from, to, onData);
	}

	hour4(ticker: string, from: Date, to: Date, onData: (aggs: Aggregate[]) => void) {
		return this.agg(ticker, 'hour4', from, to, onData);
	}

	hour(ticker: string, from: Date, to: Date, onData: (aggs: Aggregate[]) => void) {
		return this.agg(ticker, 'hour', from, to, onData);
	}

	minute5(ticker: string, from: Date, to: Date, onData: (aggs: Aggregate[]) => void) {
		return this.agg(ticker, 'minute5', from, to, onData);
	}

	minute(ticker: string, from: Date, to: Date, onData: (aggs: Aggregate[]) => void) {
		return this.agg(ticker, 'minute', from, to, onData);
	}
}
