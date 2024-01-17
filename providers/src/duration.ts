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
};
export type DurationUnit = keyof typeof durations;

export class Duration {
	constructor(
		public count: number,
		public unit: DurationUnit,
	) {}

	static fromInterval(start: number, end: number): Duration {
		const duration = intervalToDuration({ start, end });
		const units = Object.keys(durations);
		for (let i = 0; i < units.length; i++) {
			const unit = units[i] as DurationUnit;
			if (unit in duration) return new Duration((duration as any)[unit], unit);
		}

		return new Duration(end - start, 'milliseconds');
	}

	ms(): number {
		switch (this.unit) {
		case 'years': return this.count * 365.25 * 24 * 60 * 60 * 1000;
		case 'months': return this.count * 30.5 * 24 * 60 * 60 * 1000;
		case 'weeks': return this.count * 7 * 24 * 60 * 60 * 1000;
		case 'days': return this.count * 24 * 60 * 60 * 1000;
		case 'hours': return this.count * 60 * 60 * 1000;
		case 'minutes': return this.count * 60 * 1000;
		case 'seconds': return this.count * 1000;
		case 'milliseconds': return this.count;
		}
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
