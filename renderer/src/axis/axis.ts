import type { Renderer } from '../renderer.js';
import { signal, Signal, computed } from '@preact/signals';
import { getVar, clamp } from '../helpers.js';
import { Range } from '../range/Range.js';

export type Side = 'top' | 'bottom' | 'left' | 'right';


export abstract class Axis<T, Step> {
	ctx: CanvasRenderingContext2D;
	font = '14px Arial';
	paddingPx = 4;
	minPxBetweenTicks = 128;
	clipTop = false;
	clipBottom = false;
	side: Side;

	range: Signal<Range<T, Step>>;
	step: Signal<Step>;
	ticks: Signal<T[]>;

	crosshairPx = signal<number | undefined>(undefined);

	constructor(renderer: Renderer, range: Range<T, Step>, side: Side) {
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

	abstract getStep(): Step;
	abstract label(tick: T, isFirst: boolean, isCrosshair: boolean): string;

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

	isLeftToRight(): boolean {
		switch (this.side) {
			case 'top':
			case 'bottom': return true;
			case 'left':
			case 'right': return false;
		}
	}

	rangeValue(px: number): T {
		let percentage = px / this.getPx();
		if (!this.isLeftToRight()) percentage = 1 - percentage;
		return this.range.value.value(percentage);
	}

	layoutLine(tickPerc: number, ctx: CanvasRenderingContext2D) {
		switch (this.side) {
		case 'top':
		case 'bottom':
			return {
				x: tickPerc * ctx.canvas.width,
				y: 0,
			};
		case 'left':
		case 'right':
			return {
				x: 0,
				y: (1 - tickPerc) * ctx.canvas.height,
			};
		}
	}

	layoutText(
		tickPerc: number,
		heightMetrics: TextMetrics,
		metrics: TextMetrics,
		ctxUI: CanvasRenderingContext2D
	) {
		switch (this.side) {
		case 'top':
			return {
				x: tickPerc * ctxUI.canvas.width - metrics.width / 2,
				y: metrics.fontBoundingBoxAscent + this.paddingPx,
			};
		case 'bottom':
			return {
				x: tickPerc * ctxUI.canvas.width - metrics.width / 2,
				y: ctxUI.canvas.height - this.paddingPx * 2,
			};
		case 'left':
			return {
				x: this.paddingPx,
				y: (1 - tickPerc) * ctxUI.canvas.height + heightMetrics.fontBoundingBoxDescent,
			};
		case 'right':
			return {
				x: ctxUI.canvas.width - metrics.width - this.paddingPx,
				y: (1 - tickPerc) * ctxUI.canvas.height + heightMetrics.fontBoundingBoxDescent,
			};
		}
	}

	renderGrid(ctx: CanvasRenderingContext2D) {
		ctx.beginPath();

		const ticks = this.ticks.value;
		for (let i = 0; i < ticks.length; i++) {
			const tickPerc = this.range.value.percentage(ticks[i] as never);
			if (tickPerc < 0 || tickPerc > 1) continue;

			const { x, y } = this.layoutLine(tickPerc, ctx);

			switch (this.side) {
			case 'top':
			case 'bottom':
				ctx.moveTo(x, 0);
				ctx.lineTo(x, ctx.canvas.height);
				break;
			case 'left':
			case 'right':
				ctx.moveTo(0, y);
				ctx.lineTo(ctx.canvas.width, y);
				break;
			}
		}

		ctx.strokeStyle = `rgb(${getVar('--grid-color')})`;
		ctx.stroke();
	}

	renderCrosshair(ctxUI: CanvasRenderingContext2D) {
		const fgFill = `rgb(${getVar('--fg')})`;
		const bgFill = `rgb(${getVar('--bg')})`;

		const heightMetrics = ctxUI.measureText('0');
		const height = heightMetrics.fontBoundingBoxAscent + heightMetrics.fontBoundingBoxDescent;

		if (this.crosshairPx.value) {
			const crosshairPx = this.crosshairPx.value;

			ctxUI.beginPath();
			if (this.isLeftToRight()) {
				ctxUI.moveTo(crosshairPx, 0);
				ctxUI.lineTo(crosshairPx, ctxUI.canvas.height);
			} else {
				ctxUI.moveTo(0, crosshairPx);
				ctxUI.lineTo(ctxUI.canvas.width, crosshairPx);
			}
			ctxUI.strokeStyle = fgFill;
			ctxUI.stroke();

			const rangeValue = this.rangeValue(crosshairPx);
			const tickPerc = this.range.value.percentage(rangeValue as never);
			const label = this.label(rangeValue, false, true);
			const metrics = ctxUI.measureText(label);

			let { x, y } = this.layoutText(tickPerc, heightMetrics, metrics, ctxUI);
			x = clamp(x, this.paddingPx, ctxUI.canvas.width - metrics.width - this.paddingPx);

			ctxUI.fillStyle = bgFill;
			ctxUI.fillRect(
				x - this.paddingPx,
				y + metrics.fontBoundingBoxDescent + this.paddingPx,
				metrics.width + this.paddingPx * 2,
				-height - this.paddingPx * 2,
			);

			ctxUI.fillStyle = fgFill;
			ctxUI.fillText(label, x, y);
		}
	}

	renderText(ctxUI: CanvasRenderingContext2D) {
		const ticks = this.ticks.value;
		const heightMetrics = ctxUI.measureText('0');
		const height = heightMetrics.fontBoundingBoxAscent + heightMetrics.fontBoundingBoxDescent;
		const fgFill = `rgb(${getVar('--fg')})`;

		let first: DOMRect | undefined;

		ctxUI.font = this.font;
		ctxUI.fillStyle = fgFill;

		for (let i = 0; i < ticks.length; i++) {
			const tickPerc = this.range.value.percentage(ticks[i] as never);
			if (tickPerc < 0) continue;

			const label = this.label(ticks[i], !first, false);

			const metrics = ctxUI.measureText(label);
			let { x: textX, y: textY } = this.layoutText(tickPerc, heightMetrics, metrics, ctxUI);

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
	}

	render(ctx: CanvasRenderingContext2D, ctxUI: CanvasRenderingContext2D) {
		this.renderGrid(ctx);
		this.renderText(ctxUI);
		this.renderCrosshair(ctxUI);
	}
}
