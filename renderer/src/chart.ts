import { Axes } from './axes.js';
import { Mat4 } from '@jeditrader/linalg';
import { Provider } from '@jeditrader/providers';
import { ChartData } from './chart-data.js';
import { Scene } from './scene.js';

export class Chart extends Scene {
	axes: Axes;
	data: ChartData;

	constructor(
		canvas: HTMLCanvasElement,
		canvasUI: HTMLCanvasElement,
		device: GPUDevice,
		provider: Provider,
	) {
		super(canvas, canvasUI, device);
		this.axes = new Axes(device, this.uniform, canvasUI, this.sceneToClip.bind(this));
		this.data = new ChartData(device, this.uniform, provider, this.camera, this.axes.range);
		this.nodes = [
			this.axes,
			this.data,
		];
	}

	update(dt: DOMHighResTimeStamp): boolean {
		let res = super.update(dt);

		res = this.data.update() || res;
		this.axes.update(this.camera.eye, this.data.lowerLod);

		this.model = Mat4.scale(this.axes.scale);
		this.device.queue.writeBuffer(this.uniform, 0, this.uniformData());

		this.input.update();

		this.data.dirty = false;
		return res;
	}
};
