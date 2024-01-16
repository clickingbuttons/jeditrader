import { intervalToDuration } from 'date-fns';

export type DurationUnit =
	'years' |
	'months' |
	'weeks' |
	'days' |
	'hours' |
	'minutes' |
	'seconds' |
	'milliseconds';

export class Duration {
	years?: number;
	months?: number;
	weeks?: number;
	days?: number;
	hours?: number;
	minutes?: number;
	seconds?: number;
	milliseconds?: number;

	static fromInterval(start: number, end: number): Duration {
		const duration = intervalToDuration({ start, end });
		const res = new Duration();
		Object.assign(res, duration);
		if (Object.keys(duration).length === 0) res.milliseconds = end - start;
		if (res.years == 1 && (!res.months || res.months <= 6)) {
			res.years = undefined;
			res.months = (res.months ?? 0) + 12;
		} else if (res.months && res.months <= 2) {
			res.weeks = res.months * 6;
			res.months = undefined;
		} else if (res.days && res.days >= 21) {
			res.weeks = res.days / 7;
			res.days = undefined;
		} else if (res.days && res.days <= 2) {
			res.hours = (res.hours ?? 0) + res.days * 24;
			res.days = undefined;
		} else if (res.hours && res.hours <= 2) {
			res.minutes = (res.minutes ?? 0) + res.hours * 60;
			res.hours = undefined;
		} else if (res.minutes && res.minutes <= 2) {
			res.seconds = (res.seconds ?? 0) + res.minutes * 60;
			res.minutes = undefined;
		} else if (res.seconds && res.seconds <= 2) {
			res.milliseconds = (res.milliseconds ?? 0) + res.seconds * 1000;
			res.seconds = undefined;
		}
		return res;
	}

	maxDuration(): DurationUnit | undefined {
		if (this.years) return 'years';
		else if (this.months) return 'months';
		else if (this.weeks) return 'weeks';
		else if (this.days) return 'days';
		else if (this.hours) return 'hours';
		else if (this.minutes) return 'minutes';
		else if (this.seconds) return 'seconds';
		else if (this.milliseconds) return 'milliseconds';
	}
}
