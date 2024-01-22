import type { Renderer } from './renderer.js';
import { Duration, DurationUnit } from '@jeditrader/providers';
import { signal, Signal, computed } from '@preact/signals';
import { getVar, minDate, maxDate } from './helpers.js';
import {
	eachMinuteOfInterval,
	eachDayOfInterval,
	eachHourOfInterval,
	eachWeekOfInterval,
	eachMonthOfInterval,
	eachYearOfInterval,
	format as formatTime,
	startOfWeek,
	startOfYear,
	startOfMonth,
	startOfDay,
	startOfHour,
	startOfMinute,
} from 'date-fns';

export type Range<T> = { from: T, to: T };
type Unit = 'time' | 'dollars';
type Side = 'top' | 'bottom' | 'left' | 'right';

function clamp(n: number, min: number, max: number): number {
	if (n < min) return min;
	else if (n > max) return max;
	return n;
}

const year0 = new Date().setFullYear(0);

function clampTimeRange(from: number, to: number) {
	const res = {
		from: clamp(from, minDate, maxDate),
		to: clamp(to, minDate, maxDate),
	};
	return res;
}

const decimalCount = [1, 5, 10, 25, 50, 100, 250, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9];
function closest(n: number, arr: number[]): number {
	return arr.reduce((acc, cur) => Math.abs(cur - n) < Math.abs(acc - n) ? cur : acc);
}

export const lods = [
	{ ms: new Duration(200_000, 'years').ms(), step: new Duration(100_000, 'years') },
	{ ms: new Duration(100_000, 'years').ms(), step: new Duration(50_000, 'years') },
	{ ms: new Duration(20_000, 'years').ms(), step: new Duration(10_000, 'years') },
	{ ms: new Duration(10_000, 'years').ms(), step: new Duration(5_000, 'years') },
	{ ms: new Duration(2_000, 'years').ms(), step: new Duration(1_000, 'years') },
	{ ms: new Duration(1_000, 'years').ms(), step: new Duration(500, 'years') },
	{ ms: new Duration(200, 'years').ms(), step: new Duration(100, 'years') },
	{ ms: new Duration(100, 'years').ms(), step: new Duration(50, 'years') },
	{ ms: new Duration(50, 'years').ms(), step: new Duration(25, 'years') },
	{ ms: new Duration(20, 'years').ms(), step: new Duration(10, 'years') },
	{ ms: new Duration(10, 'years').ms(), step: new Duration(5, 'years') },
	{ ms: new Duration(5, 'years').ms(), step: new Duration(1, 'years') },
	{ ms: new Duration(1, 'years').ms(), step: new Duration(6, 'months') },
	{ ms: new Duration(8, 'months').ms(), step: new Duration(3, 'months') },
	{ ms: new Duration(2, 'months').ms(), step: new Duration(1, 'months') },
	{ ms: new Duration(2, 'weeks').ms(), step: new Duration(1, 'weeks') },
	{ ms: new Duration(2, 'days').ms(), step: new Duration(1, 'days') },
	{ ms: new Duration(12, 'hours').ms(), step: new Duration(6, 'hours') },
	{ ms: new Duration(4, 'hours').ms(), step: new Duration(2, 'hours') },
	{ ms: new Duration(2, 'hours').ms(), step: new Duration(1, 'hours') },
	{ ms: new Duration(60, 'minutes').ms(), step: new Duration(30, 'minutes') },
	{ ms: new Duration(30, 'minutes').ms(), step: new Duration(15, 'minutes') },
	{ ms: new Duration(10, 'minutes').ms(), step: new Duration(5, 'minutes') },
	{ ms: new Duration(5, 'minutes').ms(), step: new Duration(1, 'minutes') },
	{ ms: new Duration(20, 'seconds').ms(), step: new Duration(10, 'seconds') },
	{ ms: new Duration(10, 'seconds').ms(), step: new Duration(5, 'seconds') },
	{ ms: new Duration(5, 'seconds').ms(), step: new Duration(1, 'seconds') },
	{ ms: new Duration(200, 'milliseconds').ms(), step: new Duration(100, 'milliseconds') },
	{ ms: new Duration(100, 'milliseconds').ms(), step: new Duration(50, 'milliseconds') },
	{ ms: new Duration(50, 'milliseconds').ms(), step: new Duration(25, 'milliseconds') },
	{ ms: new Duration(20, 'milliseconds').ms(), step: new Duration(10, 'milliseconds') },
	{ ms: new Duration(10, 'milliseconds').ms(), step: new Duration(5, 'milliseconds') },
	{ ms: 0, step: new Duration(1, 'milliseconds') },
];
export const lowLods = lods.filter(d => d.step.ms() >= new Duration(1, 'months').ms());

function truncate(n: number, step: number) {
	return Math.floor(n / step) * step;
}

export function getInterval(start: number, end: number, duration: Duration) {
	let step = duration.count;

	switch (duration.unit) {
		case 'years': {
			const startDate = startOfYear(start);
			const endDate = startOfYear(end);
			start = startDate.setFullYear(truncate(startDate.getFullYear(), step));
			end = endDate.setFullYear(truncate(endDate.getFullYear(), step) + step);
			break;
		}
		case 'months': {
			const startDate = startOfMonth(start);
			const endDate = startOfMonth(end);
			start = startDate.setMonth(truncate(startDate.getMonth(), step));
			end = endDate.setMonth(truncate(endDate.getMonth(), step) + step);
			break;
		}
		case 'weeks': {
			// week of month
			start = startOfWeek(start).getTime();
			end = startOfWeek(end).getTime();
			break;
		}
		case 'days': {
			const startDate = startOfDay(start);
			const endDate = startOfDay(end);
			start = startDate.setDate(truncate(startDate.getDate(), step));
			end = endDate.setDate(truncate(endDate.getDate(), step) + step);
			break;
		}
		case 'hours': {
			const startDate = startOfHour(start);
			const endDate = startOfHour(end);
			start = startDate.setHours(truncate(startDate.getHours(), step));
			end = endDate.setHours(truncate(endDate.getHours(), step) + step);
			break;
		}
		case 'minutes': {
			const startDate = startOfMinute(start);
			const endDate = startOfMinute(end);
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

	return { start, end };
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

	// In canvas space
	crosshair = signal<number | undefined>(undefined);

	constructor(renderer: Renderer, from: number, to: number, unit: Unit, side: Side) {
		this.ctx = renderer.contextUI;
		this.unit = unit;
		this.side = side;
		this.range = signal(this.clampRange(from, to));
		this.duration = computed(this.getDuration.bind(this));
		this.ticks = computed(this.getTicks.bind(this));
		this.ticks.subscribe(() => renderer.flags.rerender = true);
		this.crosshair.subscribe(() => renderer.flags.rerender = true);
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

	private getDurationPercentUsage(duration: Duration) {
		const start = this.range.value.from;
		const end = this.range.value.to;
		const px = this.getPx();
		const ms = duration.ms();
		const nTicks = (end - start) / ms;
		const pxPer = px / nTicks;
		const res = this.minPxBetweenLines / pxPer;
		return res;
	}

	private getDuration(): Duration {
		const start = this.range.value.from;
		const end = this.range.value.to;
		const duration = Duration.fromInterval(start, end);
		if (start == end || this.unit !== 'time') return duration

		let lodIndex = 0;
		for (let i = 0; i < lods.length; i++) {
			const { ms } = lods[i];
			if (duration.ms() >= ms) lodIndex = i;
		}
		while (this.getDurationPercentUsage(lods[lodIndex].step) > 1 && lodIndex > 0) lodIndex--;
		return lods[lodIndex].step;
	}

	private getTimeTicks(): number[] {
		const duration = this.duration.value;
		const interval = getInterval(this.range.value.from, this.range.value.to, duration);
		let step = duration.count;

		switch (duration.unit) {
			case 'years': return eachYearOfInterval(interval, { step }).map(d => d.getTime());
			case 'months': return eachMonthOfInterval(interval, { step }).map(d => d.getTime());
			case 'weeks': return eachWeekOfInterval(interval, { step }).map(d => d.getTime());
			case 'days': return eachDayOfInterval(interval, { step }).map(d => d.getTime());
			case 'hours': return eachHourOfInterval(interval, { step }).map(d => d.getTime());
			case 'minutes': return eachMinuteOfInterval(interval, { step }).map(d => d.getTime());
			case 'seconds':
				step *= 1000;
				// intentional fall-through
			case 'milliseconds': {
				let i = 0;
				const res = Array((interval.end - interval.start) / step);
				for (let v = interval.start; v < interval.end; v += step) res[i++] = v;
				return res;
			}
			default: return [];
		}
	}

	private getPow10Ticks(): number[] {
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
			default: return { format: '.SSS', formatCtx: 'yyyy-MM-dd HH:mm:ss' };
		}
	}

	label(n: number, formatStr: string): string {
		switch (this.unit) {
			case 'time': return formatTime(n, formatStr);
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

	toAxisSpace(n: number) {
		let perc = n / this.getPx();
		if (!this.isLeftToRight()) perc = 1 - perc;
		const range = this.range.value;
		return range.from + perc * (range.to - range.from);
	}

	layoutVal(
		tickPerc: number,
		heightMetrics: TextMetrics,
		metrics: TextMetrics,
		ctxUI: CanvasRenderingContext2D
	) {
		var lineX, lineY;
		switch (this.side) {
		case 'top':
			lineX = tickPerc * ctxUI.canvas.width;
			lineY = metrics.fontBoundingBoxAscent;
			return {
				lineX,
				lineY,
				textX: lineX - metrics.width / 2,
				textY: lineY + this.paddingPx,
			};
		case 'bottom':
			lineX = tickPerc * ctxUI.canvas.width;
			lineY = ctxUI.canvas.height;
			return {
				lineX,
				lineY,
				textX: lineX - metrics.width / 2,
				textY: lineY - this.paddingPx * 2,
			};
		case 'left':
			lineX = -metrics.width;
			lineY = (1 - tickPerc) * ctxUI.canvas.height;
			return {
				lineX,
				lineY,
				textX: this.paddingPx,
				textY: lineY + heightMetrics.fontBoundingBoxDescent,
			};
		case 'right':
			lineX = ctxUI.canvas.width;
			lineY = (1 - tickPerc) * ctxUI.canvas.height;
			return {
				lineX,
				lineY,
				textX: lineX - metrics.width - this.paddingPx,
				textY: lineY + heightMetrics.fontBoundingBoxDescent,
			};
		}
	}

	render(ctx: CanvasRenderingContext2D, ctxUI: CanvasRenderingContext2D, crosshairDuration?: Duration) {
		const ticks = this.ticks.value;
		const range = this.range.value.to - this.range.value.from

		ctxUI.font = this.font;
		const fgFill = `rgb(${getVar('--fg') ?? '0, 0, 0'})`;
		const bgFill = `rgb(${getVar('--bg') ?? '255, 255, 255'})`;
		ctxUI.fillStyle = fgFill;
		let { format, formatCtx } = this.timeLabelFormat(this.duration.value.unit);

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
			let { lineX, lineY, textX, textY } = this.layoutVal(tickPerc, heightMetrics, metrics, ctxUI);

			// grid
			switch (this.side) {
			case 'top':
			case 'bottom':
				ctx.moveTo(lineX, 0);
				ctx.lineTo(lineX, ctx.canvas.height);
				break;
			case 'left':
			case 'right':
				ctx.moveTo(0, lineY);
				ctx.lineTo(ctx.canvas.width, lineY);
				break;
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
		ctx.strokeStyle = `rgb(${getVar('--grid-color') || '10, 10, 10'})`;
		ctx.stroke();

		// crosshair
		if (this.crosshair.value) {
			const val = this.crosshair.value;
			ctxUI.beginPath();
			switch (this.side) {
			case 'top':
			case 'bottom':
				ctxUI.moveTo(val, 0);
				ctxUI.lineTo(val, ctxUI.canvas.height);
				break;
			case 'left':
			case 'right':
				ctxUI.moveTo(0, val);
				ctxUI.lineTo(ctx.canvas.width, val);
				break;
			}

			ctxUI.strokeStyle = `rgb(${getVar('--fg')})`;
			ctxUI.stroke();

			const axisVal = this.toAxisSpace(val);
			const tickPerc = (axisVal - this.range.value.from) / range;
			if (crosshairDuration) format = this.timeLabelFormat(crosshairDuration.unit).format;
			const label = this.label(axisVal, format);
			const metrics = ctxUI.measureText(label);

			let { textX, textY } = this.layoutVal(tickPerc, heightMetrics, metrics, ctxUI);
			textX = clamp(textX, this.paddingPx, ctxUI.canvas.width - metrics.width - this.paddingPx);

			ctxUI.fillStyle = bgFill;
			ctxUI.fillRect(
				textX - this.paddingPx,
				textY + metrics.fontBoundingBoxDescent + this.paddingPx,
				metrics.width + this.paddingPx * 2,
				-height - this.paddingPx * 2,
			);

			ctxUI.fillStyle = fgFill;
			ctxUI.fillText(label, textX, textY);
		}
	}
}