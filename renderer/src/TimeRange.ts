import { Duration, ms_to_nanos } from '@jeditrader/providers';
import { truncate, clamp } from './helpers.js';
import {
	eachMinuteOfInterval,
	eachDayOfInterval,
	eachHourOfInterval,
	eachWeekOfInterval,
	eachMonthOfInterval,
	eachYearOfInterval,
	startOfWeek,
	startOfYear,
	startOfMonth,
	startOfDay,
	startOfHour,
	startOfMinute,
} from 'date-fns';

function toEpochNs(d: Date): bigint {
	return BigInt(d.getTime()) * ms_to_nanos;
}

function toOne(n: number): bigint {
	if (n < 0) return -1n;
	if (n > 0) return 1n;
	return 0n;
}

const minRangeDate = new Date(-200_000, 0).getTime();
const maxRangeDate = new Date(200_000, 0).getTime();
function clampDate(d: number): number {
	return clamp(d, minRangeDate, maxRangeDate);
}

export class TimeRange {
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
		let step = duration.count;
		let bigStep = BigInt(step);

		let start = Number(this.start / ms_to_nanos);
		let end = Number(this.end / ms_to_nanos);

		switch (duration.unit) {
		case 'years': {
			const startDate = startOfYear(start);
			const endDate = startOfYear(end);
			start = startDate.setFullYear(truncate(startDate.getFullYear(), step));
			end = endDate.setFullYear(truncate(endDate.getFullYear(), step) + step);
			break;
		}
		case 'months': {
			const startDate = startOfMonth(start);
			const endDate = startOfMonth(end);
			start = startDate.setMonth(truncate(startDate.getMonth(), step));
			end = endDate.setMonth(truncate(endDate.getMonth(), step) + step);
			break;
		}
		case 'weeks': {
			const startDate = startOfWeek(start);
			const endDate = startOfWeek(end);
			step *= 7;
			start = startDate.setDate(truncate(startDate.getDate(), step));
			end = endDate.setDate(truncate(endDate.getDate(), step) + step);
			break;
		}
		case 'days': {
			const startDate = startOfDay(start);
			const endDate = startOfDay(end);
			start = startDate.setDate(truncate(startDate.getDate(), step));
			end = endDate.setDate(truncate(endDate.getDate(), step) + step);
			break;
		}
		case 'hours': {
			const startDate = startOfHour(start);
			const endDate = startOfHour(end);
			start = startDate.setHours(truncate(startDate.getHours(), step));
			end = endDate.setHours(truncate(endDate.getHours(), step) + step);
			break;
		}
		case 'minutes': {
			const startDate = startOfMinute(start);
			const endDate = startOfMinute(end);
			start = startDate.setMinutes(truncate(startDate.getMinutes(), step));
			end = endDate.setMinutes(truncate(endDate.getMinutes(), step) + step);
			break;
		}
		case 'seconds':
			step *= 1000;
		case 'milliseconds':
			start = truncate(start, step);
			end = truncate(end, step) + step;
			break;
		case 'microseconds':
			bigStep *= 1000n;
		case 'nanoseconds':
			return {
				start: truncate(this.start, bigStep),
				end: truncate(this.end, bigStep) + bigStep,
			};
		}

		start = clampDate(start);
		end = clampDate(end);
		if (isNaN(start)) start = minRangeDate;
		if (isNaN(end)) end = maxRangeDate;

		return {
			start: BigInt(start) * ms_to_nanos,
			end: BigInt(end) * ms_to_nanos,
		};
	}

	ticks(duration: Duration): bigint[] | BigInt64Array {
		let step = duration.count;
		const interval = this.interval(duration);
		const smallInterval = {
			start: Number(interval.start / ms_to_nanos),
			end: Number(interval.end / ms_to_nanos)
		};

		switch (duration.unit) {
		case 'years': return eachYearOfInterval(smallInterval, { step }).map(toEpochNs);
		case 'months': return eachMonthOfInterval(smallInterval, { step }).map(toEpochNs);
		case 'weeks': return eachWeekOfInterval(smallInterval, { step }).map(toEpochNs);
		case 'days': return eachDayOfInterval(smallInterval, { step }).map(toEpochNs);
		case 'hours': return eachHourOfInterval(smallInterval, { step }).map(toEpochNs);
		case 'minutes': return eachMinuteOfInterval(smallInterval, { step }).map(toEpochNs);
		case 'seconds':
			step *= 1e9;
			break;
		case 'milliseconds':
			step *= 1e6;
			break;
		case 'microseconds':
			step *= 1e3;
			break;
		case 'nanoseconds':
			break;
		}

		const bigStep = BigInt(step);
		const res = new BigInt64Array(Number((interval.end - interval.start) / bigStep));

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
		if (range <= 1n) return this.clone();

		let movedStart = range * percStart1e9 / 1_000_000_000n;
		if (movedStart == 0n) movedStart = toOne(percStart);

		let movedEnd = range * percEnd1e9 / 1_000_000_000n;
		if (movedEnd == 0n) movedEnd = toOne(percEnd);

		if (this.start - movedStart > this.end + movedEnd) debugger;

		return new TimeRange(this.start - movedStart, this.end + movedEnd);
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
