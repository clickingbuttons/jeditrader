import { Axes } from './axes.js';
import { Mat4, Vec3, Vec4 } from '@jeditrader/linalg';
import { Provider } from '@jeditrader/providers';
import { ChartData } from './chart-data.js';
import { Scene } from './scene.js';
import { Lod } from './chart-data.js';

export class Chart extends Scene {
	axes: Axes;
	ticker: ChartData;

	constructor(
		canvas: HTMLCanvasElement,
		canvasUI: HTMLCanvasElement,
		device: GPUDevice,
		provider: Provider,
	) {
		super(canvas, canvasUI, device);
		this.ticker = new ChartData(device, this.uniform, provider, this.camera);
		this.axes = new Axes(device, this.uniform, this.ticker.range, canvasUI, this.sceneToClip.bind(this));
		this.nodes = [
			this.axes,
			this.ticker,
		];
	}

	update(dt: DOMHighResTimeStamp) {
		super.update(dt);
		this.ticker.update();
		this.axes.update(this.camera.eye, this.ticker.lowerLod);

		this.model = Mat4.scale(this.axes.scale);
		this.device.queue.writeBuffer(this.uniform, 0, this.uniformData());

		this.input.update();
	}

	sceneToClip(pos: Vec3): Vec4 {
		const mvp = this.camera.proj().mul(this.camera.view(false)).mul(this.model);
		let res = new Vec4([...pos, 1.0]).transform(mvp);
		// divide X and Y by W just like the GPU does
		res.x /= res.w;
		res.y /= res.w;

		return res;
	}
};
