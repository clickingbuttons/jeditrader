import { Duration, DurationUnit } from './duration.js';
import { Aggregate, Provider, Trade } from './provider.js';

const timespans = {
	years: 'agg1y',
	months: 'agg1mo',
	weeks: 'agg1w',
	days: 'agg1d',
	hours: 'agg1h',
	minutes: 'agg1m',
	seconds: 'agg1s',
	milliseconds: 'agg1s',
} as { [k in DurationUnit]: string };
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

	async agg(
		ticker: string,
		from: Date,
		to: Date,
		duration: Duration,
		onChunk: (aggs: Aggregate[]) => void
	): Promise<void> {
		if (from < clickhouseMinDate) from = clickhouseMinDate;
		const query = `SELECT toUnixTimestamp(ts) as time,
				open,
				high,
				low,
				close,
				toFloat64(volume) as volume,
				vwap
			 FROM us_equities.${timespans[duration.unit]}
			 WHERE ticker='${ticker}' AND ts BETWEEN toDateTime(${from.getTime() / 1e3}) AND toDateTime(${to.getTime() / 1e3})
			 ORDER BY ts
			 FORMAT JSON
		`;

		return fetch(`${this.url}/?query=${query}&add_http_cors_header=1`)
			.then(res => res.json())
			.then(res => res.data as ClickhouseAggregate[])
			.then(res => {
				var aggs: Aggregate[] = [];
				var newAgg: Aggregate;
				for (var i = 0; i < res.length; i++) {
					var agg = res[i];
					newAgg = {
						...agg,
						time: agg.time * 1000,
					} as Aggregate;
					aggs.push(newAgg);
				}
				onChunk(aggs);
			});
	}

	// trade(ticker: string, from: Date, to: Date, onData: (trades: Trade[]) => void) {
	// 	if (from < clickhouseMinDate) from = clickhouseMinDate;
	// 	const query = `SELECT toUnixTimestamp64Nano(ts) as epochNS,
	// 			price,
	// 			size,
	// 			conditions
	// 		 FROM us_equities.trades
	// 		 WHERE ticker='${ticker}' AND ts BETWEEN toDateTime(${from.getTime() / 1e3}) AND toDateTime(${to.getTime() / 1e3})
	// 		 ORDER BY ts
	// 		 FORMAT JSON
	// 	`;

	// 	fetch(`${this.url}/?query=${query}&add_http_cors_header=1`)
	// 		.then(res => res.json())
	// 		.then(res => res.data as ClickhouseTrade[])
	// 		.then(res => {
	// 			var trades: Trade[] = [];
	// 			var newTrade: Trade;
	// 			for (var i = 0; i < res.length; i++) {
	// 				var trade = res[i];
	// 				newTrade = {
	// 					...trade,
	// 					epochNS: +trade.epochNS,
	// 				} as Trade;
	// 				trades.push(newTrade);
	// 			}
	// 			onData(trades);
	// 		});
	// }
}
