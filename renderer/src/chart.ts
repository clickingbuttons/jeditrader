import { Axes } from './axes.js';
import { Mat4, Vec3, Vec4 } from '@jeditrader/linalg';
import { Provider, Period } from '@jeditrader/providers';
import { AutoTicker } from './auto-ticker.js';
import { Scene } from './scene.js';
import { Range } from './util.js';
import { signal, Signal, computed, effect } from '@preact/signals-core';
import { getLod, Lod } from './lod.js';
import { Renderer } from './renderer.js';
import { Cube } from '@jeditrader/geometry';
import { Mesh } from './mesh.js';
import { OHLCV } from './ohlcv.js';

export interface ChartContext {
	scene: Scene,
	autoLod: Signal<Period>;
	range: Signal<Range<Vec3>>;
}

export class Chart extends Scene {
	declare settings;
	declare materials;

	axes: Axes;
	tickers: AutoTicker[] = [];

	autoLod: Signal<Period>;

	constructor(renderer: Renderer, provider: Provider) {
		super(renderer);
		this.autoLod = computed(() => getLod(this.camera.eye.value.z));

		const superMaterials = this.materials as Scene['materials'];
		this.materials = {
			// Draw axes first.
			axes: Axes.material(this.device),
			ohlcv: OHLCV.material(this.device),
			...superMaterials,
		};

		// Test cube.
		{
			const { positions, indices } = new Cube().toIndexedTriangles();
			const mesh = new Mesh(this.device, positions, indices, {
				instances: {
					models: Mat4.scale(new Vec3([1e11, 1e11, 1e11]))
				},
			});
			this.materials.default.bind(mesh);
		}

		this.axes = new Axes(this);
		this.materials.axes.bind(this.axes);
		this.tickers = [
			new AutoTicker(this, this.axes.range, this.autoLod, this.axes.model, this.axes.buffers.models, provider),
		];
		this.materials.ohlcv.bind(...Object.values(this.tickers[0].lods));

		const superSettings = this.settings as Scene['settings'];
		this.settings = {
			...superSettings,
			axes: this.axes.settings,
		};
	}

	update(dt: DOMHighResTimeStamp) {
		this.axes.update(this.input);
		super.update(dt);
	}

	render(pass: GPURenderPassEncoder) {
		super.render(pass);
		this.axes.render();
	}

	getLod(): Lod {
		if (this.tickers.length === 0 || this.tickers[0].autoLodEnabled.value) return 'auto';
		return this.tickers[0].lod.value;
	}

	setLod(lod: Lod) {
		this.tickers.forEach(t => {
			t.autoLodEnabled.value = lod === 'auto';
			t.lod.value = lod === 'auto' ? this.autoLod.value : lod;
		});
	}
};
