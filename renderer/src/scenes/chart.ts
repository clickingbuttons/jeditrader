import type { Input } from '../input.js';
import type { Renderer } from '../renderer.js';
import { Scene } from './scene.js';
import { Axis } from '../axis.js';
import { TimeRange } from '../TimeRange.js';
import { NumberRange } from '../NumberRange.js';

export class ChartScene extends Scene {
	canvasUI: HTMLCanvasElement;
	xAxis: Axis;
	yAxis: Axis;

	constructor(renderer: Renderer) {
		super(renderer);
		this.canvasUI = renderer.canvasUI;

		const to = new Date();
		const from = new Date(to).setFullYear(to.getFullYear() - 10);
		const timeRange = TimeRange.fromEpochMs(from, to.getTime());

		this.xAxis = new Axis(renderer, timeRange, 'bottom');
		this.yAxis = new Axis(renderer, new NumberRange(0, 10, '$'), 'left');
		this.yAxis.clipBottom = true;
	}

	update(dt: DOMHighResTimeStamp, input: Input) {
		if (input.buttons.mouse0) {
			this.xAxis.pan(-input.movementX);
			this.yAxis.pan(input.movementY);
		}
		if (input.wheelY) {
			const percX = input.posX / this.canvasUI.width;
			const percY = 1 - input.posY / this.canvasUI.height;
			const zoomPerc = input.wheelY > 0 ? .1 : -.1;
			const aspectRatio = this.canvasUI.width / this.canvasUI.height;
			if (!input.buttons.shift) {
				this.xAxis.zoom(percX * zoomPerc, (1 - percX) * zoomPerc);
			}
			this.yAxis.zoom(percY * zoomPerc, (1 - percY) * zoomPerc / aspectRatio);
		}
		if (input.buttons.ctrl) {
			if (this.xAxis.crosshairPx.value != input.posX) this.xAxis.crosshairPx.value = input.posX;
			if (this.yAxis.crosshairPx.value != input.posY) this.yAxis.crosshairPx.value = input.posY;
		} else {
			if (this.xAxis.crosshairPx.value != undefined) this.xAxis.crosshairPx.value = undefined;
			if (this.yAxis.crosshairPx.value != undefined) this.yAxis.crosshairPx.value = undefined;
		}
	}

	render(ctx: CanvasRenderingContext2D, ctxUI: CanvasRenderingContext2D) {
		this.xAxis.render(ctx, ctxUI);
		this.yAxis.render(ctx, ctxUI);
	}
}
