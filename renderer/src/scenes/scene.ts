import { Input } from '../input.js';
import { Renderer, RendererFlags } from '../renderer.js';

export class Scene {
	flags: RendererFlags;
	settings = {};

	constructor(renderer: Renderer) {
		this.flags = renderer.flags;
	}

	render(ctx: CanvasRenderingContext2D, ctxUI: CanvasRenderingContext2D) {}
	update(dt: DOMHighResTimeStamp, input: Input) {}
}
