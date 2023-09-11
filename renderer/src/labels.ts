import { Vec3, Vec4 } from '@jeditrader/linalg';

export interface Label {
	text: string;
	pos: Vec3;
}

export type SceneToClip = (pos: Vec3) => Vec4;

export class Labels {
	canvas: HTMLCanvasElement;
	sceneToClip: SceneToClip;

	ctx: CanvasRenderingContext2D;

	constructor(canvas: HTMLCanvasElement, sceneToClip: SceneToClip) {
		this.canvas = canvas;
		this.sceneToClip = sceneToClip;
		const ctx = canvas.getContext('2d');
		if (!ctx) throw new Error('cannot get canvas 2d context');
		this.ctx = ctx;
	}

	setLabels(labels: Label[]) {
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.ctx.font = `32px monospace`;
		this.ctx.textBaseline = 'middle';
		this.ctx.textAlign = 'center';
		this.ctx.fillStyle = 'white';
		labels.forEach(l => {
			const clipPos = this.sceneToClip(l.pos);
			const screenPosX = (1 + clipPos.x) / 2 * this.canvas.width;
			const screenPosY = this.canvas.height - ((1 + clipPos.y) / 2 * this.canvas.height);
			this.ctx.fillText(l.text, screenPosX, screenPosY);
		});
	}
}
