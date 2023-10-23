import { signal, effect } from '@preact/signals-core';
import { Scene } from './scenes/scene.js';
import { clamp } from '@jeditrader/linalg';

export interface Label {
	text: string;
	pos: {
		x: number;
		y: number;
	};
	isHover: boolean;
	textAlign?: CanvasTextAlign;
}

interface Rectangle {
	left: number;
	right: number;
	top: number;
	bottom: number;
};

function intersects(r1: Rectangle, r2: Rectangle) {
  return !(
		r2.left > r1.right ||
		r2.right < r1.left ||
		r2.top > r1.bottom ||
		r2.bottom < r1.top
	);
}

export class Labels {
	scene: Scene;

	ctx: CanvasRenderingContext2D;
	labels: Label[] = [];

	settings = {
		font: signal('14px sans'),
		paddingPx: signal(2),
	};

	constructor(scene: Scene) {
		this.scene = scene;
		const ctx = scene.canvasUI.getContext('2d');
		if (!ctx) throw new Error('cannot get canvas 2d context');
		this.ctx = ctx;

		effect(() => this.render());
	}

	setLabels(labels: Label[]) {
		this.labels = labels;
	}

	render() {
		const ctx = this.ctx;
		ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

		const padding = this.settings.paddingPx.value;
		ctx.font = this.settings.font.value;
		ctx.textBaseline = 'middle';
		// Stoke for text shadow
		ctx.strokeStyle = 'black';
		ctx.lineWidth = 2;

		let lastRect: Rectangle = {
			left: 0,
			right: 0,
			top: 0,
			bottom: 0,
		};
		this.labels.forEach(l => {
			const measure = ctx.measureText(l.text);
			const width = measure.width;
			const height = measure.actualBoundingBoxAscent + measure.actualBoundingBoxDescent;

			// clamp to view
			const x = clamp(
				(1 + l.pos.x) / 2 * ctx.canvas.width,
				padding,
				ctx.canvas.width - width - padding
			);
			const y = clamp(
				(1 - l.pos.y) / 2 * ctx.canvas.height,
				padding,
				ctx.canvas.height - height - padding
			);

			const rect: Rectangle = {
				left: x - width / 2 - padding,
				right: x + width / 2 + padding,
				top: y - height / 2 - padding,
				bottom: y + height / 2 + padding,
			};
			// Don't draw text that overlaps.
			if (!l.isHover) {
				if (intersects(lastRect, rect)) return;
				lastRect = rect;
			}

			if (l.isHover) {
				ctx.fillStyle = 'black';
				ctx.fillRect(
					rect.left,
					rect.top,
					rect.right - rect.left,
					rect.bottom - rect.top
				);
			}
			ctx.textAlign = l.textAlign ?? 'left';
			ctx.strokeText(l.text, x, y);
			ctx.fillStyle = 'white';
			ctx.fillText(l.text, x, y);
		});
	}
}
