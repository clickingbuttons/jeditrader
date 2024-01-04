import type { Input } from '../input.js';
import type { Renderer } from '../renderer.js';
import { Signal, computed } from '@preact/signals';
import { Scene } from './scene.js';
import { Axes, Range } from '../axes.js';
import { Grid } from '../grid.js';

function lerp(i: number, from: number, to: number) {
	return (i - from) / (to - from);
}

function lerpArray(arr: number[], range: Range<number>) {
	return arr.map(i => lerp(i, range.from, range.to))
}

export class ChartScene extends Scene {
	canvasUI: HTMLCanvasElement;
	xAxes: Axes;
	yAxes: Axes;
	grid: Grid;

	constructor(renderer: Renderer) {
		super(renderer);
		this.canvasUI = renderer.canvasUI;
		this.xAxes = new Axes(renderer, new Date(2010, 0).getTime(), new Date(2020, 0).getTime(), 'time');
		this.yAxes = new Axes(renderer, 0, 10, 'dollars');
		const xTickPerc = computed(() => lerpArray(this.xAxes.ticks.value, this.xAxes.range.value));
		const yTickPerc = computed(() => lerpArray(this.yAxes.ticks.value, this.yAxes.range.value));
		this.grid = new Grid(xTickPerc, yTickPerc);
	}

	panRange(range: Signal<Range<number>>, movement: number, px: number) {
		const newRange = range.value;
		const movePerc = movement / px;
		const moved = (newRange.to - newRange.from) * movePerc;
		newRange.from -= moved;
		newRange.to -= moved;
		range.value = { ...newRange };
	}

	zoomRange(range: Signal<Range<number>>, percFrom: number, percTo: number) {
		const newRange = range.value;
		const distance = newRange.to - newRange.from;
		newRange.from -= distance * percFrom;
		newRange.to += distance * percTo;
		range.value = { ...newRange };
	}

	update(dt: DOMHighResTimeStamp, input: Input) {
		if (input.buttons.mouse0) {
			this.panRange(this.xAxes.range, input.movementX, this.canvasUI.width);
			this.panRange(this.yAxes.range, -input.movementY, this.canvasUI.height);
		}
		if (input.wheelY) {
			const percX = input.posX / this.canvasUI.width;
			const percY = 1 - input.posY / this.canvasUI.height;
			const zoomPerc = input.wheelY > 0 ? .1 : -.1;
			this.zoomRange(this.xAxes.range, percX * zoomPerc, (1 - percX) * zoomPerc);
			this.zoomRange(this.yAxes.range, percY * zoomPerc, (1 - percY) * zoomPerc);
		}
	}

	render(ctx: CanvasRenderingContext2D, ctxUI: CanvasRenderingContext2D) {
		this.grid.render(ctx);
		this.xAxes.render(ctxUI, 'bottom');
		this.yAxes.render(ctxUI, 'left');
	}
}
