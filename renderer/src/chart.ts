import { Axes } from './axes.js';
import { Mat4, Vec3 } from '@jeditrader/linalg';
import { Provider, Period } from '@jeditrader/providers';
import { ChartData } from './chart-data.js';
import { Scene } from './scene.js';
import { Range } from './util.js';
import { signal, Signal, computed } from '@preact/signals-core';
import { RendererFlags } from './renderer.js';
import { getLod, Lod } from './lod.js';

export interface ChartContext {
	device: GPUDevice;
	uniform: GPUBuffer;
	eye: Signal<Vec3>;
	autoLod: Signal<Period>;
	range: Signal<Range<Vec3>>;
}

export class Chart extends Scene {
	axes: Axes;
	tickers: ChartData[];

	range = signal<Range<Vec3>>({
		min: new Vec3([-5000, -5000, -5000]),
		max: new Vec3([5000, 5000, 5000])
	});
	autoLod: Signal<Period>;

	constructor(
		aspectRatio: Signal<number>,
		canvasUI: HTMLCanvasElement,
		device: GPUDevice,
		provider: Provider,
		flags: RendererFlags,
	) {
		super(aspectRatio, canvasUI, device, flags);
		this.autoLod = computed(() => getLod(this.camera.eye.value.z));

		const ctx: ChartContext = {
			device,
			uniform: this.uniform,
			eye: this.camera.eye,
			autoLod: this.autoLod,
			range: this.range,
		};

		this.tickers = [
			new ChartData(
				ctx,
				provider,
				flags,
			),
		];
		this.axes = new Axes(
			ctx,
			canvasUI,
			this.sceneToClip.bind(this),
			aspectRatio,
		);
		this.axes.scale.subscribe(s => this.model.value = Mat4.scale(s));
		this.nodes = [
			this.axes,
			...this.tickers,
		];
	}

	getLod(): Lod {
		if (this.tickers[0].autoLodEnabled.value) return 'auto';
		return this.tickers[0].lod.value;
	}

	setLod(lod: Lod) {
		this.tickers.forEach(t => {
			t.autoLodEnabled.value = lod === 'auto';
			t.lod.value = lod === 'auto' ? this.autoLod.value : lod;
		});
	}
};
