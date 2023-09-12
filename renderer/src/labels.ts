import { Vec3, Vec4 } from '@jeditrader/linalg';

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
	canvas: HTMLCanvasElement;
	sceneToClip: SceneToClip;

	ctx: CanvasRenderingContext2D;
	labels: Label[] = [];

	constructor(canvas: HTMLCanvasElement, sceneToClip: SceneToClip) {
		this.canvas = canvas;
		this.sceneToClip = sceneToClip;
		const ctx = canvas.getContext('2d');
		if (!ctx) throw new Error('cannot get canvas 2d context');
		this.ctx = ctx;
	}

	setLabels(labels: Label[]) {
		this.labels = labels;
	}

	render() {
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

		const height = 14;
		const face = 'sans';
		this.ctx.font = `${height}px ${face}`;
		this.ctx.textBaseline = 'middle';
		this.ctx.textAlign = 'center';
		this.ctx.fillStyle = 'white';
		// Stoke for text shadow
		this.ctx.strokeStyle = 'black';
		this.ctx.lineWidth = 2;

		let lastRect: Rectangle = {
			left: 0,
			right: 0,
			top: 0,
			bottom: 0,
		};
		this.labels.forEach(l => {
			const clipPos = this.sceneToClip(l.pos);
			if (clipPos.z < 0) return;
			const x = (1 + clipPos.x) / 2 * this.canvas.width;
			const y = (1 - clipPos.y) / 2 * this.canvas.height;
			const width = this.ctx.measureText(l.text).width;
			const rect: Rectangle = {
				left: x - width / 2,
				right: x + width / 2,
				top: y + height / 2,
				bottom: y + height * 3 / 2,
			};
			// Don't draw text that overlaps.
			if (intersects(lastRect, rect)) return;
			lastRect = rect;

			this.ctx.strokeText(l.text, x, y);
			this.ctx.fillText(l.text, x, y);
		});
	}
}
