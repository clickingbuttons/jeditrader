import type { Renderer } from '../renderer.js';
import { NumberRange } from '../range/NumberRange.js';
import { Axis, Side } from './axis.js';

const decimalCount = [1, 5, 10, 25, 50, 100, 250, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9];
function closest(n: number, arr: number[]): number {
	return arr.reduce((acc, cur) => Math.abs(cur - n) < Math.abs(acc - n) ? cur : acc);
}

export class NumberAxis extends Axis<number, number> {
	constructor(
		renderer: Renderer,
		range: NumberRange,
		side: Side,
		public unitPrefix: string = '',
		public unitSuffix: string = '',
	) {
		super(renderer, range, side);
	}

	getStep(): number {
		const start = this.range.value.start;
		const end = this.range.value.end;
		let step = 10 ** Math.round(Math.log10(end - start) - 2);
		const pxPerTick = this.getPx() / ((end - start) / step);
		const ratio = closest(this.minPxBetweenTicks / pxPerTick, decimalCount);
		step *= ratio;
		return step;
	}

	label(n: number): string {
		let dec = 2;
		const step = this.step.value as number;
		if (step < 0.01) dec = Math.ceil(-Math.log10(step));
		if (step >= 10) dec = 0;
		const fixed = n.toFixed(dec);
		return this.unitPrefix + fixed + this.unitSuffix;
	}
}
