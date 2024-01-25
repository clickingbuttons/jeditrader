import type { Input } from '../input.js';
import type { Renderer } from '../renderer.js';
import { Scene } from './scene.js';
import { TimeAxis, NumberAxis } from '../axis/index.js';
import { TimeRange, NumberRange } from '../range/index.js';
import { signal } from '@preact/signals-core';

export interface Shape {
	caption: string;
	contains(x: number, y: number): boolean;
}
export class Rectangle implements Shape {
	constructor(
		public x: number,
		public y: number,
		public width: number,
		public height: number,
		public caption: string,
	) {};

	contains(x: number, y: number): boolean {
		return (x >= this.x && x <= this.x + this.width) && (y >= this.y && y <= this.y + this.height);
	}
};
export class Circle implements Shape {
	constructor(
		public x: number,
		public y: number,
		public radius: number,
		public caption: string,
	) {};

	contains(x: number, y: number): boolean {
		return Math.sqrt((x - this.x) ** 2 + (y - this.y) ** 2) <= this.radius;
	}
};

export class ChartScene implements Scene {
	canvasUI: HTMLCanvasElement;
	xAxis: TimeAxis;
	yAxis: NumberAxis;

	shapes: Shape[] = [];

	settings = {};
	hover = signal('');

	constructor(public renderer: Renderer) {
		this.canvasUI = renderer.canvasUI;

		const to = new Date();
		const from = new Date(to).setFullYear(to.getFullYear() - 10);
		const timeRange = TimeRange.fromEpochMs(from, to.getTime());

		this.xAxis = new TimeAxis(renderer, timeRange, 'bottom');
		this.yAxis = new NumberAxis(renderer, new NumberRange(0, 10, '$'), 'left');
		this.yAxis.clipBottom = true;
	}

	update(_dt: DOMHighResTimeStamp, input: Input) {
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

		let newHover = '';
		for (let i = 0; i < this.shapes.length; i++) {
			if (this.shapes[i].contains(input.posX, input.posY)) {
				newHover += this.shapes[i].caption;
			}
		}
		this.hover.value = newHover;
	}

	render(ctx: CanvasRenderingContext2D, ctxUI: CanvasRenderingContext2D) {
		this.shapes = [];
		this.xAxis.render(ctx, ctxUI);
		this.yAxis.render(ctx, ctxUI);
	}
}
