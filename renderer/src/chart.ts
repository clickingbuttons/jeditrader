import { Axes } from './axes.js';
import { Provider } from '@jeditrader/providers';
import { ChartData } from './lod.js';
import { Scene } from './scene.js';

export class Chart extends Scene {
	axes: Axes;
	data: ChartData;

	constructor(
		canvas: HTMLCanvasElement,
		canvasUI: HTMLCanvasElement,
		device: GPUDevice,
		provider: Provider,
		ticker: string,
	) {
		super(canvas, canvasUI, device);
		this.data = new ChartData(device, this.uniform, provider, ticker);
		this.setTicker(ticker);
		this.axes = new Axes(device, this.uniform, this.data.range, canvasUI, this.camera);
		this.nodes = [
			this.axes,
			this.data,
		];
	}

	setTicker(ticker: string) {
		this.data.setTicker(ticker);
	}

	uniformData() {
		return new Float32Array([
			...super.uniformData(),
			...this.axes.scale.f32(), 0,
		]);
	}

	update(dt: DOMHighResTimeStamp) {
		super.update(dt);
		this.dirty |= this.data.update(this.camera.eye);
		this.axes.update(this.camera.eye, this.data.lowerLod);

		this.device.queue.writeBuffer(this.uniform, 0, this.uniformData());

		this.input.update();
	}

	toggleLodLock() {
		this.data.lockLod = !this.data.lockLod;
	}
};
