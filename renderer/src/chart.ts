import { Axes } from './axes.js';
import { Mat4, Vec3 } from '@jeditrader/linalg';
import { Provider } from '@jeditrader/providers';
import { ChartData } from './chart-data.js';
import { Scene } from './scene.js';
import { Range } from './util.js';
import { signal, Signal } from '@preact/signals-core';
import { RendererFlags } from './renderer.js';

export class Chart extends Scene {
	axes: Axes;
	data: ChartData;

	range = signal<Range<Vec3>>({
		min: new Vec3([-5000, -5000, -5000]),
		max: new Vec3([5000, 5000, 5000])
	});

	constructor(
		aspectRatio: Signal<number>,
		canvasUI: HTMLCanvasElement,
		device: GPUDevice,
		provider: Provider,
		flags: RendererFlags,
	) {
		super(aspectRatio, canvasUI, device, flags);
		this.data = new ChartData(
			device,
			this.uniform,
			provider,
			this.camera.eye,
			this.range,
			flags,
		);
		this.axes = new Axes(
			device,
			this.uniform,
			canvasUI,
			this.sceneToClip.bind(this),
			this.camera.eye,
			this.data.lod,
			this.range
		);
		this.axes.scale.subscribe(s => this.model.value = Mat4.scale(s));
		this.nodes = [
			this.axes,
			this.data,
		];
	}
};
