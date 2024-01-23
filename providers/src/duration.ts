import {
	intervalToDuration,
	startOfWeek,
	startOfYear,
	startOfMonth,
	startOfDay,
	startOfHour,
	startOfMinute,
} from 'date-fns';
import { truncate } from './helpers.js';

export const durations = {
	year: undefined,
	month: undefined,
	week: undefined,
	day: undefined,
	hour: undefined,
	minute: undefined,
	second: undefined,
	millisecond: undefined,
	microsecond: undefined,
	nanosecond: undefined,
};
export type DurationUnit = keyof typeof durations;
export const ms_to_nanos = 1_000_000n;

export class Duration {
	constructor(
		public count: number,
		public unit: DurationUnit,
	) {}

	static fromInterval(startNs: bigint, endNs: bigint): Duration {
		const duration = intervalToDuration({
			start: Number(startNs / ms_to_nanos),
			end: Number(endNs / ms_to_nanos),
		});
		const units = Object.keys(durations);
		for (let i = 0; i < units.length; i++) {
			const unit = units[i] as DurationUnit;
			if (unit in duration) return new Duration((duration as any)[unit], unit);
		}
		const ns = endNs - startNs;
		if (ns > 1_000_000n) return new Duration(Number(ns / 1_000_000n), 'millisecond');
		if (ns > 1_000n) return new Duration(Number(ns / 1_000n), 'microsecond');

		return new Duration(Number(ns), 'nanosecond');
	}

	ms(): number {
		switch (this.unit) {
		case 'year': return this.count * 365.25 * 24 * 60 * 60 * 1000;
		case 'month': return this.count * (365.25 / 12) * 24 * 60 * 60 * 1000;
		case 'week': return this.count * 7 * 24 * 60 * 60 * 1000;
		case 'day': return this.count * 24 * 60 * 60 * 1000;
		case 'hour': return this.count * 60 * 60 * 1000;
		case 'minute': return this.count * 60 * 1000;
		case 'second': return this.count * 1000;
		case 'millisecond': return this.count;
		case 'microsecond': return this.count / 1000;
		case 'nanosecond': return this.count / 1e6;
		}
	}

	ns(): bigint {
		return BigInt(this.ms() * 1e6);
	}

	clone(): Duration {
		return new Duration(this.count, this.unit);
	}

	toString(): string {
		return `${this.count} ${this.unit}`;
	}

	eq(other: Duration): boolean {
		return this.unit === other.unit && this.count === other.count;
	}

	truncate(epochNs: bigint, defaultIfNaN: bigint, offset: number = 0): bigint {
		const epochMs = Number(epochNs / ms_to_nanos);
		let date: Date;

		offset *= this.count;
		let bigMul = BigInt(this.count);

		switch (this.unit) {
		case 'year':
			date = startOfYear(epochMs);
			date.setFullYear(truncate(date.getFullYear(), this.count) + offset);
			break;
		case 'month':
			date = startOfMonth(epochMs);
			date.setMonth(truncate(date.getMonth(), this.count) + offset);
			break;
		case 'week':
			date = startOfWeek(epochMs);
			date.setDate(truncate(date.getDate(), this.count * 7) + offset * 7);
			break;
		case 'day':
			date = startOfDay(epochMs);
			date.setDate(truncate(date.getDate(), this.count) + offset);
			break;
		case 'hour':
			date = startOfHour(epochMs);
			date.setHours(truncate(date.getHours(), this.count) + offset);
			break;
		case 'minute':
			date = startOfMinute(epochMs);
			date.setMinutes(truncate(date.getMinutes(), this.count) + offset);
			break;
		case 'second':
			bigMul *= 1_000_000_000n;
			return truncate(epochNs, bigMul) + BigInt(offset) * bigMul;
		case 'millisecond':
			bigMul *= 1_000_000n;
			return truncate(epochNs, bigMul) + BigInt(offset) * bigMul;
		case 'microsecond':
			bigMul *= 1_000n;
			return truncate(epochNs, bigMul) + BigInt(offset) * bigMul;
		case 'nanosecond':
			return truncate(epochNs, bigMul) + BigInt(offset) * bigMul;
		}

		if (isNaN(date.getTime())) return defaultIfNaN;
		return BigInt(date.getTime()) * ms_to_nanos;
	}
}
