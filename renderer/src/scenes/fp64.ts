import { Scene } from './scene.js';
import { Renderer } from '../renderer.js';

// Verifies can zoom from years to milliseconds
export class TickerScene extends Scene {

	render(ctx: CanvasRenderingContext2D) {
		ctx.fillStyle = 'black';
		ctx.fillRect(0, 0, 200, 200);
	}
};
