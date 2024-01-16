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
		public unit: DurationUnit,
		public count: number,
	) {}

	static fromInterval(start: number, end: number): Duration {
		const duration = intervalToDuration({ start, end });
		const units = Object.keys(durations);
		for (let i = 0; i < units.length; i++) {
			const unit = units[i] as DurationUnit;
			if (unit in duration) return new Duration(unit, (duration as any)[unit]);
		}

		return new Duration('milliseconds', end - start);
	}

	couldLower(): boolean {
		if (this.unit !== 'milliseconds' && this.count <= 2) return true;
		return false;
	}

	lower(): Duration {
		switch (this.unit) {
		case 'years': return new Duration('months', this.count * 12);
		case 'months': return new Duration('weeks', this.count * 4);
		case 'weeks': return new Duration('days', this.count * 7);
		case 'days': return new Duration('hours', this.count * 24);
		case 'hours': return new Duration('minutes', this.count * 60);
		case 'minutes': return new Duration('seconds', this.count * 60);
		case 'seconds': return new Duration('milliseconds', this.count * 1000);
		default: return new Duration(this.unit, this.count);
		}
	}

	raise(): Duration {
		switch (this.unit) {
		case 'months': return new Duration('years', this.count / 12);
		case 'weeks': return new Duration('months', this.count / 4);
		case 'days': return new Duration('weeks', this.count / 7);
		case 'hours': return new Duration('days', this.count / 24);
		case 'minutes': return new Duration('hours', this.count / 60);
		case 'seconds': return new Duration('minutes', this.count / 60);
		case 'milliseconds': return new Duration('seconds', this.count / 1000);
		default: return new Duration(this.unit, this.count);
		}
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
}
