import type { Input } from '../input.js';
import type { Renderer } from '../renderer.js';
import { Scene } from './scene.js';
import { Axis } from '../axis.js';

export class ChartScene extends Scene {
	canvasUI: HTMLCanvasElement;
	xAxis: Axis;
	yAxis: Axis;

	constructor(renderer: Renderer) {
		super(renderer);
		this.canvasUI = renderer.canvasUI;
		const to = new Date();
		const from = new Date(to).setFullYear(to.getFullYear() - 10);
		this.xAxis = new Axis(renderer, from, to.getTime(), 'time', 'bottom');
		this.yAxis = new Axis(renderer, 0, 10, 'dollars', 'left');
		this.yAxis.clipBottom = true;

		renderer.width.subscribe(() => this.panRange(this.xAxis, 0, 1));
		renderer.height.subscribe(() => this.panRange(this.xAxis, 0, 1));
	}

	panRange(axis: Axis, movement: number, px: number) {
		const from = axis.range.value.from;
		const to = axis.range.value.to;
		const movePerc = movement / px;
		const moved = (to - from) * movePerc;
		axis.setRange(from - moved, to - moved);
	}

	zoomRange(axis: Axis, percFrom: number, percTo: number) {
		const from = axis.range.value.from;
		const to = axis.range.value.to;
		const distance = to - from;
		axis.setRange(from - distance * percFrom, to + distance * percTo);
	}

	update(dt: DOMHighResTimeStamp, input: Input) {
		if (input.buttons.mouse0) {
			this.panRange(this.xAxis, input.movementX, this.canvasUI.width);
			this.panRange(this.yAxis, -input.movementY, this.canvasUI.height);
		}
		if (input.wheelY) {
			const percX = input.posX / this.canvasUI.width;
			const percY = 1 - input.posY / this.canvasUI.height;
			const zoomPerc = input.wheelY > 0 ? .1 : -.1;
			const aspectRatio = this.canvasUI.width / this.canvasUI.height;
			if (!input.buttons.shift) {
				this.zoomRange(this.xAxis, percX * zoomPerc, (1 - percX) * zoomPerc);
			}
			this.zoomRange(this.yAxis, percY * zoomPerc, (1 - percY) * zoomPerc / aspectRatio);
		}
		if (input.buttons.ctrl) {
			if (this.xAxis.crosshair.value != input.posX) this.xAxis.crosshair.value = input.posX;
			if (this.yAxis.crosshair.value != input.posY) this.yAxis.crosshair.value = input.posY;
		} else {
			if (this.xAxis.crosshair.value != undefined) this.xAxis.crosshair.value = undefined;
			if (this.yAxis.crosshair.value != undefined) this.yAxis.crosshair.value = undefined;
		}
	}

	render(ctx: CanvasRenderingContext2D, ctxUI: CanvasRenderingContext2D) {
		this.xAxis.render(ctx, ctxUI);
		this.yAxis.render(ctx, ctxUI);
	}
}
