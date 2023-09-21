import { Vec3, Vec4 } from '@jeditrader/linalg';
import { signal, effect } from '@preact/signals-core';
import { Scene } from './scene.js';

export interface Label {
	text: string;
	pos: Vec3;
}

export type SceneToClip = (pos: Vec3) => Vec4;

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
		ctx.font = `${this.settings.font.value}`;
		ctx.textBaseline = 'middle';
		ctx.textAlign = 'center';
		ctx.fillStyle = 'white';
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
			const clipPos = this.scene.sceneToClip(l.pos);
			if (clipPos.z < 0) return;
			const x = (1 + clipPos.x) / 2 * ctx.canvas.width;
			const y = (1 - clipPos.y) / 2 * ctx.canvas.height;
			const measure = ctx.measureText(l.text);
			const width = measure.width;
			const height = measure.actualBoundingBoxAscent + measure.actualBoundingBoxDescent;
			const rect: Rectangle = {
				left: x - width / 2 - padding,
				right: x + width / 2 + padding,
				top: y + height / 2 - padding,
				bottom: y + height * 3 / 2 + padding,
			};
			// Don't draw text that overlaps.
			if (intersects(lastRect, rect)) return;
			lastRect = rect;

			ctx.strokeText(l.text, x, y);
			ctx.fillText(l.text, x, y);
		});
	}
}
