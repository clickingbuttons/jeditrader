import { Axes } from '../meshes/axes.js';
import { Vec3, Mat4 } from '@jeditrader/linalg';
import { Provider, Period } from '@jeditrader/providers';
import { AutoTicker } from '../auto-ticker.js';
import { Scene } from './scene.js';
import { Range } from '../util.js';
import { Signal, computed } from '@preact/signals-core';
import { getLod, Lod } from '../lod.js';
import { Renderer } from '../renderer.js';
import { Cone } from '@jeditrader/geometry';
import { Mesh } from '../meshes/index.js';
import { AxesMaterial } from '../materials/index.js';
import { Color } from '../color.js';

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
			axes: new AxesMaterial(this.device),
			...superMaterials,
		};

		// Test cube.
		{
			const radius = 1e10;
			const mesh = Mesh.fromCSG(this.device, new Cone(), {
				model: Mat4.scale(new Vec3(radius))
			});
			this.materials.default.bind(mesh);
		}
		this.light.value = {
			color: Color.white,
			pos: new Vec3(1.36e12, 9e10, 7e10),
		};

		this.axes = new Axes(this);
		this.materials.axes.bind(this.axes);

		this.axes.range.subscribe(range => this.fitInView(range));

		this.tickers = [
			new AutoTicker(this, this.autoLod, this.axes.range, this.axes.resources.inModel, provider),
		];
		this.materials.phong.bind(...Object.values(this.tickers[0].lods));

		const superSettings = this.settings as Scene['settings'];
		this.settings = {
			...superSettings,
			axes: this.axes.settings,
		};
	}

	fitInView(range: Range<Vec3>) {
		return super.fitInView(range, this.axes.model.value);
	}

	update(dt: DOMHighResTimeStamp) {
		this.axes.update(this);
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
