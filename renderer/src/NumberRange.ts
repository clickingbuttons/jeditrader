import { truncate } from './helpers.js';

export class NumberRange {
	constructor(
		public start: number,
		public end: number,
		public unit: string
	) {
	}

	interval(step: number) {
		return {
			start: truncate(this.start, step),
			end: truncate(this.end, step) + step
		};
	}

	ticks(step: number): number[] {
		const { start, end } = this.interval(step);
		const res: number[] = [];
		for (let i = start; i <= end; i += step) res.push(i);
		return res;
	}

	pan(percentage: number): NumberRange {
		const moved = (this.end - this.start) * percentage;
		return new NumberRange(
			this.start + moved,
			this.end + moved,
			this.unit
		);
	}

	zoom(percFrom: number, percTo: number): NumberRange {
		const distance = this.end - this.start;
		const start = this.start - distance * percFrom;
		const end = this.end + distance * percTo;

		if (end <= start) return this.clone();
		return new NumberRange(start, end, this.unit);
	}

	value(percentage: number): number {
		return this.start + (this.end - this.start) * percentage;
	}

	percentage(value: number) {
		return (value - this.start) / (this.end - this.start);
	}

	clone(): NumberRange {
		return new NumberRange(this.start, this.end, this.unit);
	}
}
