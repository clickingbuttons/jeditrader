import { Camera } from './camera.js';
import { Vec3 } from '@jeditrader/linalg';

export interface Label {
	text: string;
	pos: Vec3;
}

export class Labels {
	canvas: HTMLCanvasElement;
	camera: Camera;

	ctx: CanvasRenderingContext2D;

	constructor(canvas: HTMLCanvasElement, camera: Camera) {
		this.canvas = canvas;
		this.camera = camera;
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
		// this.ctx.fillText('hello world', this.ctx.canvas.width / 2, this.ctx.canvas.height / 2);
		labels.forEach(l => {
			const clipPos = this.camera.sceneToClip(l.pos);
			const screenPosX = (1 + clipPos.x) / 2 * this.canvas.width;
			const screenPosY = this.canvas.height - ((1 + clipPos.y) / 2 * this.canvas.height);
			this.ctx.fillText(l.text, screenPosX, screenPosY);
		});
	}
}
