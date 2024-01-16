import type { Renderer } from './renderer.js';
import { Duration, DurationUnit } from '@jeditrader/providers';
import { signal, Signal, computed } from '@preact/signals';
import {
	eachMinuteOfInterval,
	eachDayOfInterval,
	eachHourOfInterval,
	eachWeekOfInterval,
	eachMonthOfInterval,
	eachYearOfInterval,
	format,
	startOfWeek,
	endOfWeek,
} from 'date-fns';

export type Range<T> = { from: T, to: T };
type Unit = 'time' | 'dollars';
type Side = 'top' | 'bottom' | 'left' | 'right';

function clamp(n: number, min: number, max: number): number {
	if (n < min) return min;
	else if (n > max) return max;
	return n;
}

// We round to previous duration which may be up to 100_000 years
export const maxDate = 8640000000000000 - 100_000 * 365 * 24 * 60 * 60 * 1000;
export const minDate = -maxDate;
const year0 = new Date().setFullYear(0);

function clampTimeRange(from: number, to: number) {
	const res = {
		from: clamp(from, minDate, maxDate),
		to: clamp(to, minDate, maxDate),
	};
	return res;
}

const decimalCount = [1, 5, 10, 25, 50, 100, 200, 250, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9];
function closest(n: number, arr: number[]): number {
	return arr.reduce((acc, cur) => Math.abs(cur - n) < Math.abs(acc - n) ? cur : acc);
}

function countableNumbers(duration: DurationUnit): number[] {
	switch (duration) {
		case 'years': return decimalCount;
		case 'months': return [1, 4, 6, 12];
		case 'weeks': return [1];
		case 'days': return [1];
		case 'hours': return [1, 2, 6, 12, 24];
		case 'minutes':
		case 'seconds': return [1, 5, 10, 15, 30, 60];
		case 'milliseconds': return decimalCount;
	}
}

function truncate(n: number, step: number) {
	return Math.floor(n / step) * step;
}

export class Axis {
	ctx: CanvasRenderingContext2D;
	font = '14px Arial';
	paddingPx = 4;
	minPxBetweenLines = 128;
	clipTop = false;
	clipBottom = false;
	side: Side;
	unit: Unit;

	range: Signal<Range<number>>;
	/// If unit === 'time'
	duration: Signal<Duration>;
	ticks: Signal<number[]>;

	constructor(renderer: Renderer, from: number, to: number, unit: Unit, side: Side) {
		this.ctx = renderer.contextUI;
		this.unit = unit;
		this.side = side;
		this.range = signal(this.clampRange(from, to));
		this.duration = computed(this.getDuration.bind(this));
		this.ticks = computed(this.getTicks.bind(this));
		this.ticks.subscribe(() => renderer.flags.rerender = true);
	}

	clampRange(from: number, to: number) {
		if (this.unit === 'time') return clampTimeRange(from, to);
		return { from, to };
	}

	setRange(from: number, to: number) {
		this.range.value = this.clampRange(from, to);
	}

	getPx(): number {
		switch (this.side) {
		case 'top':
		case 'bottom': return this.ctx.canvas.width;
		case 'left':
		case 'right': return this.ctx.canvas.height;
		}
	}

	getDurationPercentUsage(duration: Duration) {
		const start = this.range.value.from;
		const end = this.range.value.to;
		const px = this.getPx();
		const ms = duration.ms();
		const nTicks = (end - start) / ms;
		const pxPer = px / nTicks;
		const res = this.minPxBetweenLines / pxPer;
		return res;
	}

	getFitDuration(lowered: Duration) {
		const countable = countableNumbers(lowered.unit);
		for (let i = 0; i < countable.length; i++) {
			const newDuration = new Duration(lowered.unit, lowered.count);
			newDuration.count = countable[i];

			const usage = this.getDurationPercentUsage(newDuration);
			if (usage < 1) return newDuration;
		}
	}

	getDuration(): Duration {
		const start = this.range.value.from;
		const end = this.range.value.to;
		const duration = Duration.fromInterval(start, end);
		if (start == end || this.unit !== 'time') return duration

		if (duration.couldLower()) {
			const lowered = duration.lower();
			const fit = this.getFitDuration(lowered);
			if (fit) return fit;
		}
		const fit = this.getFitDuration(duration);
		if (fit) return fit;

		const raised = duration.raise();
		const countable = countableNumbers(raised.unit);
		raised.count = closest(raised.count, countable);
		return raised;
	}

	getInterval(duration?: DurationUnit) {
		const startDate = new Date(this.range.value.from);
		const endDate = new Date(this.range.value.to);

		let start = startDate.getTime();
		let end = endDate.getTime();
		let step = this.duration.value.count;

		switch (duration) {
			case 'years': {
				start = startDate.setFullYear(truncate(startDate.getFullYear(), step));
				end = endDate.setFullYear(truncate(endDate.getFullYear(), step) + step);
				break;
			}
			case 'months': {
				start = startDate.setMonth(0);
				end = endDate.setMonth(12);
				break;
			}
			case 'weeks': {
				// week of month
				step = 1;
				start = startOfWeek(startDate).getTime();
				end = endOfWeek(endDate).getTime() + step;
				break;
			}
			case 'days': {
				start = startDate.setDate(truncate(startDate.getDate(), step));
				end = endDate.setDate(truncate(endDate.getDate(), step) + step);
				break;
			}
			case 'hours': {
				start = startDate.setHours(truncate(startDate.getHours(), step));
				end = endDate.setHours(truncate(endDate.getHours(), step) + step);
				break;
			}
			case 'minutes': {
				start = startDate.setMinutes(truncate(startDate.getMinutes(), step));
				end = endDate.setMinutes(truncate(endDate.getMinutes(), step) + step);
				break;
			}
			case 'seconds': {
				step *= 1000;
				start = truncate(start, step);
				end = truncate(end, step) + step;
				break;
			}
			case 'milliseconds': {
				start = truncate(start, step);
				end = truncate(end, step) + step;
				break;
			}
		}

		return {
			interval: { start, end },
			step,
		};
	}

	getTimeTicks(): number[] {
		const duration = this.duration.value;
		const { step, interval } = this.getInterval(duration.unit);

		switch (duration.unit) {
			case 'years': return eachYearOfInterval(interval, { step }).map(d => d.getTime());
			case 'months': return eachMonthOfInterval(interval, { step }).map(d => d.getTime());
			case 'weeks': return eachWeekOfInterval(interval, { step }).map(d => d.getTime());
			case 'days': return eachDayOfInterval(interval, { step }).map(d => d.getTime());
			case 'hours': return eachHourOfInterval(interval, { step }).map(d => d.getTime());
			case 'minutes': return eachMinuteOfInterval(interval, { step }).map(d => d.getTime());
			case 'seconds':
			case 'milliseconds': {
				let i = 0;
				const res = Array((interval.end - interval.start) / step);
				for (let v = interval.start; v < interval.end; v += step) res[i++] = v;
				return res;
			}
			default: return [];
		}
	}

	getPow10Ticks(): number[] {
		const min = this.range.value.from;
		const max = this.range.value.to;
		let step = 10 ** Math.round(Math.log10(max - min) - 2);
		const px = this.getPx();
		const pxPer = px / ((max - min) / step);
		const ratio = closest(this.minPxBetweenLines / pxPer, decimalCount);
		step *= ratio;
		const evenStart = Math.floor(min / step) * step;

		const res: number[] = [];
		for (let i = evenStart; i <= max; i += step) res.push(i);

		return res;
	}

	getTicks(): number[] {
		switch (this.unit) {
			case 'time': return this.getTimeTicks();
			default: return this.getPow10Ticks();
		}
	}

	timeLabelFormat(duration?: DurationUnit): { format: string, formatCtx?: string } {
		switch (duration) {
			case 'years': {
				if (this.range.value.from < year0) return { format: 'yyyy GG' };
				return { format: 'yyyy' };
			}
			case 'months': return { format: 'yyyy-MM' };
			case 'weeks':
			case 'days': return { format: 'yyyy-MM-dd' };
			case 'hours':
			case 'minutes': return { format: 'HH:mm', formatCtx: 'yyyy-MM-dd' };
			case 'seconds': return { format: ':ss', formatCtx: 'yyyy-MM-dd HH:mm' };
			case 'milliseconds':
			default:
				return { format: '.SSS', formatCtx: 'yyyy-MM-dd HH:mm:ss' };
		}
	}

	label(n: number, formatStr: string): string {
		switch (this.unit) {
			case 'time': return format(n, formatStr);
			case 'dollars': return '$' + n.toFixed(2);
			default: return n.toString();
		}
	}

	isLeftToRight(): boolean {
		switch (this.side) {
			case 'top':
			case 'bottom': return true;
			case 'left':
			case 'right': return false;
		}
	}

	render(ctx: CanvasRenderingContext2D, ctxUI: CanvasRenderingContext2D) {
		const ticks = this.ticks.value;
		const range = this.range.value.to - this.range.value.from

		ctxUI.font = this.font;
		ctxUI.fillStyle = 'white';
		const { format, formatCtx } = this.timeLabelFormat(this.duration.value.unit);

		const heightMetrics = ctxUI.measureText('0');
		const height = heightMetrics.fontBoundingBoxAscent + heightMetrics.fontBoundingBoxDescent;

		ctx.beginPath();

		let first: DOMRect | undefined;

		for (let i = 0; i < ticks.length; i++) {
			const tickPerc = (ticks[i] - this.range.value.from) / range;
			if (tickPerc < 0) continue;

			let label = this.label(ticks[i], format);
			if (!first && formatCtx) label = this.label(ticks[i], formatCtx);

			const metrics = ctxUI.measureText(label);
			let x = 0;
			let y = 0;
			let textX = 0;
			let textY = 0;
			switch (this.side) {
				case 'top':
					x = tickPerc * ctxUI.canvas.width;
					y = metrics.fontBoundingBoxAscent;
					textX = x - metrics.width / 2;
					textY = y + this.paddingPx;
					break;
				case 'bottom':
					x = tickPerc * ctxUI.canvas.width;
					y = ctxUI.canvas.height;
					textX = x - metrics.width / 2;
					textY = y - this.paddingPx * 2;
					break;
				case 'left':
					x = -metrics.width;
					y = (1 - tickPerc) * ctxUI.canvas.height;
					textX = this.paddingPx;
					textY = y + heightMetrics.fontBoundingBoxDescent;
					break;
				case 'right':
					x = ctxUI.canvas.width;
					y = (1 - tickPerc) * ctxUI.canvas.height;
					textX = x - metrics.width - this.paddingPx;
					textY = y + heightMetrics.fontBoundingBoxDescent;
					break;
			}
			// grid
			switch (this.side) {
				case 'top':
				case 'bottom':
					ctx.moveTo(x, 0);
					ctx.lineTo(x, ctx.canvas.height);
				case 'left':
				case 'right':
					ctx.moveTo(0, y);
					ctx.lineTo(ctx.canvas.width, y);
			}

			if (
				(this.isLeftToRight() && first && textX < first.x + first.width + this.paddingPx) ||
				(this.clipBottom && textY > ctxUI.canvas.height - height - this.paddingPx * 2) ||
				(this.clipTop && textY < height + metrics.fontBoundingBoxAscent + this.paddingPx * 2)
			) continue;

			if (!first) {
				textX = Math.max(textX, this.paddingPx);
				first = new DOMRect(textX, textY, metrics.width + this.paddingPx * 4, height);
			}
			ctxUI.fillText(label, textX, textY);
		}

		// grid
		ctx.strokeStyle = 'gray';
		ctx.stroke();
	}
}
