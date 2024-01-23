import { intervalToDuration } from 'date-fns';

export const durations = {
	years: undefined,
	months: undefined,
	weeks: undefined,
	days: undefined,
	hours: undefined,
	minutes: undefined,
	seconds: undefined,
	milliseconds: undefined,
	microseconds: undefined,
	nanoseconds: undefined,
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
		if (ns > 1_000_000n) return new Duration(Number(ns / 1_000_000n), 'milliseconds');
		if (ns > 1_000n) return new Duration(Number(ns / 1_000n), 'microseconds');

		return new Duration(Number(ns), 'nanoseconds');
	}

	ms(): number {
		switch (this.unit) {
		case 'years': return this.count * 365.25 * 24 * 60 * 60 * 1000;
		case 'months': return this.count * (365.25 / 12) * 24 * 60 * 60 * 1000;
		case 'weeks': return this.count * 7 * 24 * 60 * 60 * 1000;
		case 'days': return this.count * 24 * 60 * 60 * 1000;
		case 'hours': return this.count * 60 * 60 * 1000;
		case 'minutes': return this.count * 60 * 1000;
		case 'seconds': return this.count * 1000;
		case 'milliseconds': return this.count;
		case 'microseconds': return this.count / 1000;
		case 'nanoseconds': return this.count / 1e6;
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
}
