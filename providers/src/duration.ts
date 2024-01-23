import { intervalToDuration } from 'date-fns';

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
}
