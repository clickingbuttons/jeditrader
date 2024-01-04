import type { Renderer } from './renderer.js';
import { getNext, Period } from '@jeditrader/providers';
import { toymd } from './helpers.js';
import { signal, Signal, computed } from '@preact/signals';

export type Range<T> = { from: T, to: T };
type Unit = 'time' | 'dollars';
type Side = 'top' | 'bottom' | 'left' | 'right';

// Doesn't have to be exact.
const msPerSecond = 1000;
const msPerMinute = 60 * msPerSecond;
const msPerHour = 60 * msPerMinute;
const msPerDay = 24 * msPerHour;
const msPerMonth = 30 * msPerDay;
const msPerYear = 12 * msPerMonth;

function pad2(n: number) {
	return (n + '').padStart(2, '0');
}

function timeLabel(period: Period, ms: number): string {
	let d = new Date(ms);
	switch (period) {
	case 'year':
		return '' + d.getUTCFullYear();
	case 'month':
		return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`
	case 'week':
	case 'day':
		return toymd(d);
	case 'hour4':
	case 'hour':
		return `${toymd(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
	case 'minute5':
	case 'minute':
		return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
	case 'second':
		return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
	case 'ns':
		return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}.${pad2(d.getMilliseconds())}`;
	default:
		throw new Error('unknown period ' + period);
	}
}

function dollarLabel(dollars: number) {
	return '$' + dollars.toFixed(2);
}

function getAlign(side: Side): CanvasTextAlign {
	switch (side) {
		case 'top':
		case 'bottom': return 'center';
		case 'left': return 'left';
		case 'right': return 'right';
	}
}

function getBaseline(side: Side): CanvasTextBaseline {
	switch (side) {
		case 'top': return 'top';
		case 'bottom': return 'bottom';
		case 'left':
		case 'right': return 'middle';
	}
}

export class Axes {
	font = '12px Arial';
	padding = '.5rem';
	minTicks = 4;

	/// If unit === 'time'
	period: Signal<Period>;
	range: Signal<Range<number>>;
	unit: Unit;

	ticks: Signal<number[]>;

	constructor(renderer: Renderer, from: number, to: number, unit: Unit) {
		this.range = signal({ from, to });
		this.period = computed(this.getPeriod.bind(this));
		this.unit = unit;
		this.ticks = computed(this.getTicks.bind(this));
		this.ticks.subscribe(() => renderer.flags.rerender = true);
	}

	/// Period that shows at least minTicks
	getPeriod(): Period {
		const ms = this.range.value.to - this.range.value.from;
		const minTicks = this.minTicks;
		if (ms > msPerYear * minTicks) return 'year';
		if (ms > msPerMonth * minTicks) return 'month';
		if (ms > msPerDay * minTicks) return 'day';
		if (ms > msPerHour * minTicks) return 'hour';
		if (ms > msPerMinute * minTicks) return 'minute';
		if (ms > msPerSecond * minTicks) return 'second';

		return 'ns';
	}

	getTimeTicks(): number[] {
		const period = this.period.value;
		const min = this.range.value.from;
		const max = this.range.value.to;
		const start = getNext(new Date(min), period, 0, true);
		const end = getNext(new Date(max), period, 1, true);

		const res: number[] = [];
		for (let t = start; t <= end; t = getNext(t, period)) res.push(t.getTime());

		return res;
	}

	getLogTicks(): number[] {
		const min = this.range.value.from;
		const max = this.range.value.to;
		let step = 10 ** Math.floor(Math.log10(max - min) - 1);
		while ((max - min) / step > this.minTicks) step *= 10;
		step /= 10;
		const evenStart = Math.floor(min / step) * step;

		const res: number[] = [];
		for (let i = evenStart; i <= max; i += step) res.push(i);

		return res;
	}

	getTicks(): number[] {
		switch (this.unit) {
			case 'time': return this.getTimeTicks();
			case 'dollars': return this.getLogTicks();
			default: return [];
		}
	}

	label(n: number): string {
		switch (this.unit) {
		case 'time': return timeLabel(this.period.value, n);
		case 'dollars': return dollarLabel(n);
		default: return n.toString();
		}
	}

	render(ctx: CanvasRenderingContext2D, side: Side) {
		const ticks = this.ticks.value;
		const range = this.range.value.to - this.range.value.from

		ctx.font = this.font;
		ctx.fillStyle = 'white';
		ctx.textAlign = getAlign(side);
		ctx.textBaseline = getBaseline(side);
		const metrics = ctx.measureText('0');
		const actualHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

		for (let i = 0; i < ticks.length; i++) {
			const tickPerc = (ticks[i] - this.range.value.from) / range;
			var x = 0;
			var y = 0;
			switch (side) {
			case 'top':
				x = tickPerc * ctx.canvas.width;
				y = actualHeight;
				break;
			case 'bottom':
				x = tickPerc * ctx.canvas.width;
				y = ctx.canvas.height;
				break;
			case 'left':
				y = (1 - tickPerc) * ctx.canvas.height;
				break;
			case 'right':
				x = ctx.canvas.width;
				y = (1 - tickPerc) * ctx.canvas.height;
				break;
			}
			var label = this.label(ticks[i]);
			ctx.fillText(label, x, y);
		}
	}
}
