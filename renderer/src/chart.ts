import { Axes } from './axes.js';
import { Mat4, Vec3, Vec4, degToRad } from '@jeditrader/linalg';
import { Provider, Period } from '@jeditrader/providers';
import { AutoTicker } from './auto-ticker.js';
import { Scene } from './scene.js';
import { Range } from './util.js';
import { Signal, computed } from '@preact/signals-core';
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

		this.axes.range.subscribe(range => {
			// Center on sphere to make math easy.
			// https://stackoverflow.com/questions/2866350/move-camera-to-fit-3d-scene
			let center = new Vec4([...range.max.add(range.min).divScalar(2), 1.0]);
			// The effect may not have run yet, so get it manually
			const model = this.axes.getModel();
			// Take longest dimension as radius.
			let dims = new Vec4([...range.max.sub(range.min), 1.0]);

			// Move to axes space.
			center = center.transform(model);
			dims = dims.transform(model);
			const radius = Math.max(...dims) / 2;

			const eye = center;
			eye.y *= 0.8;
			eye.z = radius / Math.tan(degToRad(this.camera.fov.value / 2));
			this.camera.eye.value = new Vec3([eye.x, eye.y, eye.z]);
		});

		this.tickers = [
			new AutoTicker(this, this.autoLod, this.axes.range, this.axes.buffers.models, provider),
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
