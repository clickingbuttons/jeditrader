import { Duration, ms_to_nanos } from '@jeditrader/providers';
import { clampDate, minDate, maxDate } from '../helpers.js';
import {
	eachMinuteOfInterval,
	eachDayOfInterval,
	eachHourOfInterval,
	eachWeekOfInterval,
	eachMonthOfInterval,
	eachYearOfInterval,
} from 'date-fns';
import { Range } from './Range.js';

function toEpochNs(d: Date): bigint {
	return BigInt(d.getTime()) * ms_to_nanos;
}

function toOne(n: number): bigint {
	if (n < 0) return -1n;
	if (n > 0) return 1n;
	return 0n;
}

export class TimeRange implements Range<bigint, Duration> {
	/// start and end are epoch ns
	constructor(
		public start: bigint,
		public end: bigint,
	) {
	}

	static fromEpochMs(from: number, to: number) {
		return new TimeRange(
			BigInt(from) * ms_to_nanos,
			BigInt(to) * ms_to_nanos,
		);
	}

	static fromDates(from: Date, to: Date) {
		return TimeRange.fromEpochMs(from.getTime(), to.getTime());
	}

	interval(duration: Duration) {
		let start = duration.truncate(this.start, minDate);
		let end = duration.truncate(this.end, maxDate, 2);
		start = clampDate(start);
		end = clampDate(end);

		return { start, end };
	}

	ticks(duration: Duration): bigint[] {
		let step = duration.count;
		const interval = this.interval(duration);
		const smallInterval = {
			start: Number(interval.start / ms_to_nanos),
			end: Number(interval.end / ms_to_nanos)
		};

		switch (duration.unit) {
		case 'year': return eachYearOfInterval(smallInterval, { step }).map(toEpochNs);
		case 'month': return eachMonthOfInterval(smallInterval, { step }).map(toEpochNs);
		case 'week': return eachWeekOfInterval(smallInterval, { step }).map(toEpochNs);
		case 'day': return eachDayOfInterval(smallInterval, { step }).map(toEpochNs);
		case 'hour': return eachHourOfInterval(smallInterval, { step }).map(toEpochNs);
		case 'minute': return eachMinuteOfInterval(smallInterval, { step }).map(toEpochNs);
		case 'second':
			step *= 1e9;
			break;
		case 'millisecond':
			step *= 1e6;
			break;
		case 'microsecond':
			step *= 1e3;
			break;
		case 'nanosecond':
			break;
		}

		const bigStep = BigInt(step);
		const res = new Array(Number((interval.end - interval.start) / bigStep));

		let i = 0;
		for (let v = interval.start; v < interval.end; v += bigStep) res[i++] = v;

		return res;
	}

	pan(percentage: number): TimeRange {
		const perc1e9 = BigInt(Math.round(percentage * 1e9));
		let moved = (this.end - this.start) * perc1e9 / 1_000_000_000n;
		if (moved == 0n) moved = toOne(percentage);
		return new TimeRange(this.start + moved, this.end + moved);
	}

	zoom(percStart: number, percEnd: number): TimeRange {
		const percStart1e9 = BigInt(Math.round(percStart * 1e9));
		const percEnd1e9 = BigInt(Math.round(percEnd * 1e9));
		const range = this.end - this.start;

		let movedStart = range * percStart1e9 / 1_000_000_000n;
		if (movedStart == 0n) movedStart = toOne(percStart);

		let movedEnd = range * percEnd1e9 / 1_000_000_000n;
		if (movedEnd == 0n) movedEnd = toOne(percEnd);

		const start = this.start - movedStart;
		let end = this.end + movedEnd;
		if (end - start <= 0) end = start + 1n;

		if (start > end) debugger;

		return new TimeRange(start, end);
	}

	value(percentage: number): bigint {
		return this.start + (this.end - this.start) * BigInt(Math.round(percentage * 1e6)) / 1_000_000n;
	}

	percentage(value: bigint): number {
		return Number(value - this.start) / Number(this.end - this.start);
	}

	clone(): TimeRange {
		return new TimeRange(this.start, this.end);
	}
}
