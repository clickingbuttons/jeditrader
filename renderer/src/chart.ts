import { Axes } from './axes.js';
import { Mat4, Vec3, Vec4 } from '@jeditrader/linalg';
import { Provider, Period } from '@jeditrader/providers';
import { AutoTicker } from './auto-ticker.js';
import { Scene } from './scene.js';
import { Range } from './util.js';
import { signal, Signal, computed, effect } from '@preact/signals-core';
import { getLod, Lod } from './lod.js';
import { Input } from './input.js';
import { Renderer } from './renderer.js';
import { Cube } from '@jeditrader/geometry';
import { Mesh } from './mesh.js';

export interface ChartContext {
	scene: Scene,
	autoLod: Signal<Period>;
	range: Signal<Range<Vec3>>;
}

export class Chart extends Scene {
	declare settings;

	axes: Axes;
	tickers: AutoTicker[] = [];

	range = signal<Range<Vec3>>({
		min: new Vec3([new Date(0).getTime(), 0, 0]),
		max: new Vec3([new Date(2010, 1).getTime(), 100, 0])
	});
	autoLod: Signal<Period>;

	constructor(renderer: Renderer, provider: Provider) {
		super(renderer);
		this.autoLod = computed(() => getLod(this.camera.eye.value.z));

		this.camera.eye.value = new Vec3([
			649252057699.8112,
			-196524753900.5597,
			589981060393.1589,
		]);
		this.camera.pitch.value = -1.3;
		this.camera.yaw.value = 0.018;

		this.materials.axes = Axes.material(this.device);
		this.axes = new Axes(this, this.range);
		this.materials.axes.bind([this.axes]);

		const superSettings = this.settings as Scene['settings'];
		this.settings = {
			...superSettings,
			axes: this.axes.settings,
		};
		this.model.value = Mat4.scale(new Vec3([1, 3e9, 1]));

		const rad = 31536000000 / 2;
		const radius = new Vec4([rad, rad, rad, 1.0]).transform(this.modelInv.value);
		const c = new Cube(new Vec3([0, 0, 0]), new Vec3(radius));
		const { positions, indices } = c.toIndexedTriangles();
		const mesh = new Mesh(this.device, positions, indices, {
			instances: {
				count: 1,
				stride: positions.length,
			}
		});
		this.materials.mesh.bind([mesh]);

		this.tickers = [
			new AutoTicker(this, this.range, this.autoLod, provider),
		];
		this.materials.mesh.bind(Object.values(this.tickers[0].lods));
		// effect(() => {
		// 	const origin = this.axes.scaleOffset ?? new Vec3([0, 0, 0]);
		// 	this.model = Mat4
		// 		.translate(origin)
		// 		.scale(this.axes.scale.value)
		// 		.translate(origin.mulScalar(-1));
		// });

		this.flags.rerender = true;
	}

	update(dt: DOMHighResTimeStamp) {
		// this.axes.update(this.input);
		super.update(dt);
	}

	render(pass: GPURenderPassEncoder) {
		super.render(pass);
		this.axes.render();
	}

	// getLod(): Lod {
	// 	if (this.tickers[0].autoLodEnabled.value) return 'auto';
	// 	return this.tickers[0].lod.value;
	// }

	// setLod(lod: Lod) {
	// 	this.tickers.forEach(t => {
	// 		t.autoLodEnabled.value = lod === 'auto';
	// 		t.lod.value = lod === 'auto' ? this.autoLod.value : lod;
	// 	});
	// }
};
