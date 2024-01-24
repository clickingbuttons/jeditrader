export interface Range<T, Step> {
	start: T;
	end: T;

	ticks(step: Step): T[];
	pan(percentage: number): Range<T, Step>;
	zoom(percStart: number, percEnd: number): Range<T, Step>;
	value(percentage: number): T;
	percentage(value: T): number;
}
