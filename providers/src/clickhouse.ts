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
	constructor(
		public url: string,
	) {}

	async agg(
		ticker: string,
		from: Date,
		to: Date,
		duration: Duration,
		onChunk: (aggs: Aggregate[]) => void
	): Promise<void> {
		if (from < clickhouseMinDate) from = clickhouseMinDate;
		const query = `
WITH
	toStartOfInterval(ts, INTERVAL ${duration.count} ${duration.unit.substring(0, duration.unit.length - 1)}) as timespan,
	sum(t.volume) AS v
SELECT
	toUnixTimestamp(timespan) AS time,
	argMin(open, ts) AS open,
	max(high) AS high,
	min(low) AS low,
	argMax(close, ts) AS close,
	toFloat64(v) AS volume,
	sum(liquidity) / v AS vwap

FROM us_equities.${timespans[duration.unit]} as t
WHERE ticker='${ticker}' AND ts BETWEEN toDateTime(${from.getTime() / 1e3}) AND toDateTime(${to.getTime() / 1e3})
GROUP BY timespan
ORDER BY time ASC
FORMAT JSON
`;
		const resp = await fetch(`${this.url}/?add_http_cors_header=1`, { method: 'POST', body: query });
		if (resp.status !== 200) throw new Error(await resp.text());

		const json = await resp.json()
		const data = json.data as ClickhouseAggregate[];
		for (var i = 0; i < data.length; i++) data[i].time *= 1000;
		onChunk(data);
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
