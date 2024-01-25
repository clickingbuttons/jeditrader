import { Duration, DurationUnit } from './duration.js';
import { Aggregate, Provider, Ticker, Trade } from './provider.js';
import { clamp } from './helpers.js';

const timespans = {
	year: 'agg1y',
	month: 'agg1mo',
	week: 'agg1w',
	day: 'agg1d',
	hour: 'agg1h',
	minute: 'agg1m',
	second: 'agg1s',
	millisecond: 'agg1s',
} as { [k in DurationUnit]: string };

// Clickhouse date types:
// 1. Date [1970-01-01, 2149-06-06]
// 2. Date32, Date64 [1900-01-01 00:00:00, 2262-04-11 23:47:16]
//
// Since we don't know which is being used, use max min and min max
const clickhouseMinDate = 18000000000000n; // 1970-01-01
const clickhouseMaxDate = 9223300800000000000n; // 2262-04-10 to avoid dealing with timezones
function clampDate(date: bigint): bigint {
	return clamp(date, clickhouseMinDate, clickhouseMaxDate);
}

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

	async agg(
		ticker: string,
		startEpochNs: bigint,
		endEpochNs: bigint,
		duration: Duration,
		onChunk: (aggs: Aggregate[]) => void
	): Promise<void> {
		startEpochNs = clampDate(startEpochNs);
		endEpochNs = clampDate(endEpochNs);
		const query = `
WITH
	toStartOfInterval(ts, INTERVAL ${duration.count} ${duration.unit}) as timespan,
	sum(t.volume) AS v
SELECT
	toUnixTimestamp64Nano(toDateTime64(timespan, 9)) AS epochNs,
	argMin(open, ts) AS open,
	max(high) AS high,
	min(low) AS low,
	argMax(close, ts) AS close,
	toFloat64(v) AS volume,
	sum(liquidity) / v AS vwap,
	sum(count) as count

FROM us_equities.${timespans[duration.unit]} as t
WHERE ticker='${ticker}' AND ts BETWEEN fromUnixTimestamp64Nano(${startEpochNs}) AND fromUnixTimestamp64Nano(${endEpochNs})
GROUP BY timespan
ORDER BY epochNs ASC
FORMAT JSON
`;
		const resp = await this.doQuery(query);
		const json = await resp.json()
		let data = json.data as ClickhouseAggregate[];
		let newData = data as unknown as Aggregate[];
		for (var i = 0; i < newData.length; i++) newData[i].epochNs = BigInt(newData[i].epochNs);
		onChunk(newData as Aggregate[]);
	}

	async trade(
		ticker: string,
		startEpochNs: bigint,
		endEpochNs: bigint,
		onChunk: (trades: Trade[]) => void
	): Promise<void> {
		startEpochNs = clampDate(startEpochNs);
		endEpochNs = clampDate(endEpochNs);
		const query = `
SELECT toUnixTimestamp64Nano(ts) as epochNS,
	price,
	size,
	conditions
FROM us_equities.trades
WHERE ticker='${ticker}' AND ts BETWEEN fromUnixTimestamp64Nano(${startEpochNs}) AND fromUnixTimestamp64Nano(${endEpochNs})
ORDER BY ts
FORMAT JSON
		`;

		const resp = await this.doQuery(query);
		const json = await resp.json()
		let data = json.data as ClickhouseTrade[];
		let newData = data as unknown as Trade[];
		for (var i = 0; i < newData.length; i++) newData[i].epochNs = BigInt(newData[i].epochNs);
		onChunk(newData as Trade[]);
	}
}
