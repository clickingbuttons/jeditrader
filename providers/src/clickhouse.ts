import { Duration, DurationUnit } from './duration.js';
import { Aggregate, Provider, Ticker, Trade } from './provider.js';

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
const clickhouseMinDate = 0n;

type ClickhouseAggregate = {
	epochNs: string;
	open: number;
	high: number;
	low: number;
	close: number;
	volume: number;
	vwap: number;
	count: number;
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

	private async doQuery(query: string) {
		const resp = await fetch(`${this.url}/?add_http_cors_header=1`, { method: 'POST', body: query });
		if (resp.status !== 200) throw new Error(await resp.text());
		return resp;
	}

	async agg(
		ticker: string,
		startEpochNs: bigint,
		endEpochNs: bigint,
		duration: Duration,
		onChunk: (aggs: Aggregate[]) => void
	): Promise<void> {
		if (startEpochNs < clickhouseMinDate) startEpochNs = clickhouseMinDate;
		const query = `
WITH
	toStartOfInterval(ts, INTERVAL ${duration.count} ${duration.unit.substring(0, duration.unit.length - 1)}) as timespan,
	sum(t.volume) AS v
SELECT
	toUnixTimestamp64Nano(timespan) AS epochNs,
	argMin(open, ts) AS open,
	max(high) AS high,
	min(low) AS low,
	argMax(close, ts) AS close,
	toFloat64(v) AS volume,
	sum(liquidity) / v AS vwap,
	sum(count) as count

FROM us_equities.${timespans[duration.unit]} as t
WHERE ticker='${ticker}' AND ts BETWEEN fromUnixTimestamp64Nano(${startEpochNs}) AND fromUnixTimestamp64Nano(${endEpochNs}, 9)
GROUP BY timespan
ORDER BY time ASC
FORMAT JSON
`;
		const resp = await this.doQuery(query);
		const json = await resp.json()
		let data = json.data as ClickhouseAggregate[];
		let newData = data as unknown as Aggregate[];
		for (var i = 0; i < newData.length; i++) newData[i].epochNs = BigInt(newData[i].epochNs);
		onChunk(newData as Aggregate[]);
	}

	async tickers(like: string, limit: number): Promise<Ticker[]> {
		const query = `
SELECT DISTINCT
	ticker,
	name
FROM tickers
WHERE name LIKE '%${like}%' OR ticker LIKE '%${like}%'
LIMIT ${limit}
FORMAT JSON
`;
		const resp = await this.doQuery(query);

		const json = await resp.json()
		const data = json.data as Ticker[];
		return data;
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
