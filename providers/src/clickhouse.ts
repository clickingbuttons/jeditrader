import { Aggregate, Period, Provider, Trade } from './provider.js';

const timespans = {
	'second': 'agg1s',
	'minute': 'agg1m',
	'minute5': 'agg5m',
	'hour': 'agg1h',
	'hour4': 'agg4h',
	'day': 'agg1d',
	'week': 'agg1w',
	'month': 'agg1mo',
	'year': 'agg1y',
};
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

type ClickhouseTrade = {
	epochNS: string;
	price: number;
	size: number;
	conditions: number[];
}

export class Clickhouse implements Provider {
	url: string;

	constructor(url: string) {
		this.url = url;
	}

	private agg(
		ticker: string,
		timespan: keyof typeof timespans,
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
			 FROM us_equities.${timespans[timespan]}
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

	second(ticker: string, from: Date, to: Date, onData: (aggs: Aggregate[]) => void) {
		return this.agg(ticker, 'second', from, to, onData);
	}

	trade(ticker: string, from: Date, to: Date, onData: (trades: Trade[]) => void) {
		if (from < clickhouseMinDate) from = clickhouseMinDate;
		const query = `SELECT toUnixTimestamp64Nano(ts) as epochNS,
				price,
				size,
				conditions
			 FROM us_equities.trades
			 WHERE ticker='${ticker}' AND ts BETWEEN toDateTime(${from.getTime() / 1e3}) AND toDateTime(${to.getTime() / 1e3})
			 ORDER BY ts
			 FORMAT JSON
		`;

		fetch(`${this.url}/?query=${query}&add_http_cors_header=1`)
			.then(res => res.json())
			.then(res => res.data as ClickhouseTrade[])
			.then(res => {
				var trades: Trade[] = [];
				var newTrade: Trade;
				for (var i = 0; i < res.length; i++) {
					var trade = res[i];
					newTrade = {
						...trade,
						epochNS: +trade.epochNS,
					} as Trade;
					trades.push(newTrade);
				}
				onData(trades);
			});
	}
}
