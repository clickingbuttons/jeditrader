import { Input } from '../input.js';

export interface Scene {
	settings: any;
	render(ctx: CanvasRenderingContext2D, ctxUI: CanvasRenderingContext2D): void;
	update(dt: DOMHighResTimeStamp, input: Input): void;
}
