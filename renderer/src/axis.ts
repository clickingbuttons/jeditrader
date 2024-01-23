import type { Renderer } from './renderer.js';
import { Duration, DurationUnit, ms_to_nanos } from '@jeditrader/providers';
import { signal, Signal, computed } from '@preact/signals';
import { getVar, clamp } from './helpers.js';
import { format as formatTime } from 'date-fns';
import { lods } from './lods.js';
import { TimeRange } from './TimeRange.js';
import { NumberRange } from './NumberRange.js';

type Side = 'top' | 'bottom' | 'left' | 'right';

const decimalCount = [1, 5, 10, 25, 50, 100, 250, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9];
function closest(n: number, arr: number[]): number {
	return arr.reduce((acc, cur) => Math.abs(cur - n) < Math.abs(acc - n) ? cur : acc);
}

export class Axis {
	ctx: CanvasRenderingContext2D;
	font = '14px Arial';
	paddingPx = 4;
	minPxBetweenTicks = 128;
	clipTop = false;
	clipBottom = false;
	side: Side;

	range: Signal<TimeRange | NumberRange>;
	step: Signal<Duration | number>;
	ticks: Signal<number[] | bigint[] | BigInt64Array>;

	crosshairPx = signal<number | undefined>(undefined);

	constructor(renderer: Renderer, range: TimeRange | NumberRange, side: Side) {
		this.ctx = renderer.contextUI;
		this.side = side;
		this.range = signal(range);
		this.step = computed(() => this.getStep());
		this.ticks = computed(() => this.range.value.ticks(this.step.value as any));
		this.ticks.subscribe(() => renderer.flags.rerender = true);
		this.crosshairPx.subscribe(() => renderer.flags.rerender = true);

		renderer.width.subscribe(() => this.pan(0));
		renderer.height.subscribe(() => this.pan(0));
	}

	pan(px: number) {
		const percentage = px / this.getPx();
		this.range.value = this.range.value.pan(percentage);
	}

	zoom(percFrom: number, percTo: number) {
		this.range.value = this.range.value.zoom(percFrom, percTo);
	}

	getPx(): number {
		switch (this.side) {
		case 'top':
		case 'bottom': return this.ctx.canvas.width;
		case 'left':
		case 'right': return this.ctx.canvas.height;
		}
	}

	percentUsage(duration: Duration) {
		const px = this.getPx();
		const range = this.range.value as TimeRange;
		const nTicks = (range.end - range.start) / duration.ns();
		if (nTicks == 0n) return 0;
		const pxPer = BigInt(px) / nTicks;
		return this.minPxBetweenTicks / Number(pxPer);
	}

	private getStep(): Duration | number {
		if (this.range.value instanceof NumberRange) {
			const start = this.range.value.start;
			const end = this.range.value.end;
			let step = 10 ** Math.round(Math.log10(end - start) - 2);
			const pxPerTick = this.getPx() / ((end - start) / step);
			const ratio = closest(this.minPxBetweenTicks / pxPerTick, decimalCount);
			step *= ratio;
			return step;
		} else if (this.range.value instanceof TimeRange) {
			const start = this.range.value.start;
			const end = this.range.value.end;
			const duration = Duration.fromInterval(start, end);
			const duration_ms = duration.ms();

			let lodIndex = Math.max(lods.findIndex(l => duration_ms >= l.ms), 0);
			while (this.percentUsage(lods[lodIndex].step) > 1 && lodIndex > 0) lodIndex--;
			const step = lods[lodIndex].step;
			return step;
		} else {
			throw new Error('unknown range type' + typeof this.range);
		}
	}

	private timeLabelFormat(duration?: DurationUnit): { format: string, formatCtx?: string } {
		switch (duration) {
			case 'years': {
				const bc = BigInt(new Date(-1, 0).getTime()) * ms_to_nanos;
				if (this.range.value.start < bc) return { format: 'yyyy GG' };
				return { format: 'yyyy' };
			}
			case 'months': return { format: 'yyyy-MM' };
			case 'weeks':
			case 'days': return { format: 'yyyy-MM-dd' };
			case 'hours':
			case 'minutes': return { format: 'HH:mm', formatCtx: 'yyyy-MM-dd' };
			case 'seconds': return { format: ':ss', formatCtx: 'yyyy-MM-dd HH:mm' };
			case 'milliseconds': return { format: '.SSS', formatCtx: 'yyyy-MM-dd HH:mm:ss' };
			case 'microseconds': return { format: 'microseconds', formatCtx: 'yyyy-MM-dd HH:mm:ss.SSS' };
			case 'nanoseconds': return { format: 'nanoseconds', formatCtx: 'yyyy-MM-dd HH:mm:ss.SSS' };
			default: return { format: '', formatCtx: '' };
		}
	}

	label(n: number | bigint, formatStr: string): string {
		if (typeof n == 'bigint') {
			if (formatStr === 'microseconds' || formatStr === 'nanoseconds') return (n % ms_to_nanos).toString();
			return formatTime(Number(n / ms_to_nanos), formatStr);
		} else if (typeof n == 'number') {
			let dec = 2;
			const step = this.step.value as number;
			if (step < 0.01) dec = Math.ceil(-Math.log10(step));
			if (step >= 10) dec = 0;
			const res = n.toFixed(dec);
			// if (this.range.unit == '$') return this.range.unit + res;
			return res;
		}

		return n + '?';
	}

	isLeftToRight(): boolean {
		switch (this.side) {
			case 'top':
			case 'bottom': return true;
			case 'left':
			case 'right': return false;
		}
	}

	rangeValue(px: number): number | bigint {
		let percentage = px / this.getPx();
		if (!this.isLeftToRight()) percentage = 1 - percentage;
		return this.range.value.value(percentage);
	}

	layoutTick(
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

		ctxUI.font = this.font;
		const fgFill = `rgb(${getVar('--fg')})`;
		const bgFill = `rgb(${getVar('--bg')})`;
		ctxUI.fillStyle = fgFill;
		let { format, formatCtx } = this.timeLabelFormat((this.step.value as Duration).unit);

		const heightMetrics = ctxUI.measureText('0');
		const height = heightMetrics.fontBoundingBoxAscent + heightMetrics.fontBoundingBoxDescent;

		ctx.beginPath();

		let first: DOMRect | undefined;

		for (let i = 0; i < ticks.length; i++) {
			const tickPerc = this.range.value.percentage(ticks[i] as never);
			if (tickPerc < 0) continue;

			let label = this.label(ticks[i], format);
			if (!first && formatCtx) label = this.label(ticks[i], formatCtx);

			const metrics = ctxUI.measureText(label);
			let { lineX, lineY, textX, textY } = this.layoutTick(tickPerc, heightMetrics, metrics, ctxUI);

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
		ctx.strokeStyle = `rgb(${getVar('--grid-color')})`;
		ctx.stroke();

		// crosshair
		if (this.crosshairPx.value) {
			const crosshairPx = this.crosshairPx.value;

			ctxUI.beginPath();
			if (this.isLeftToRight()) {
				ctxUI.moveTo(crosshairPx, 0);
				ctxUI.lineTo(crosshairPx, ctxUI.canvas.height);
			} else {
				ctxUI.moveTo(0, crosshairPx);
				ctxUI.lineTo(ctx.canvas.width, crosshairPx);
			}
			ctxUI.strokeStyle = `rgb(${getVar('--fg')})`;
			ctxUI.stroke();

			const rangeValue = this.rangeValue(crosshairPx);
			const tickPerc = this.range.value.percentage(rangeValue as never);
			if (crosshairDuration) format = this.timeLabelFormat(crosshairDuration.unit).format;
			const label = this.label(rangeValue, format);
			const metrics = ctxUI.measureText(label);

			let { textX, textY } = this.layoutTick(tickPerc, heightMetrics, metrics, ctxUI);
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
