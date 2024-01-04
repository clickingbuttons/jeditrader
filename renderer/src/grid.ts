import type { Signal } from '@preact/signals';

export class Grid {
	xTickPerc: Signal<number[]>;
	yTickPerc: Signal<number[]>;

	constructor(xTickPerc: Signal<number[]>, yTickPerc: Signal<number[]>) {
		this.xTickPerc = xTickPerc;
		this.yTickPerc = yTickPerc;
	}
	render(ctx: CanvasRenderingContext2D) {
		const xTicks = this.xTickPerc.value;
		const yTicks = this.yTickPerc.value;
		ctx.beginPath();
		for (let i = 0; i < xTicks.length; i++) {
			ctx.moveTo(xTicks[i] * ctx.canvas.width, 0);
			ctx.lineTo(xTicks[i] * ctx.canvas.width, ctx.canvas.height);
		}
		for (let i = 0; i < yTicks.length; i++) {
			ctx.moveTo(0, (1 - yTicks[i]) * ctx.canvas.height);
			ctx.lineTo(ctx.canvas.width, (1 - yTicks[i]) * ctx.canvas.height);
		}
		ctx.strokeStyle = 'gray';
		ctx.stroke();
	}
}
