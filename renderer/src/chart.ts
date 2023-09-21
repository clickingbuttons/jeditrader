import { Axes } from './axes.js';
import { Mat4, Vec3 } from '@jeditrader/linalg';
import { Provider, Period } from '@jeditrader/providers';
import { AutoTicker } from './auto-ticker.js';
import { Scene } from './scene.js';
import { Range } from './util.js';
import { signal, Signal, computed, effect } from '@preact/signals-core';
import { getLod, Lod } from './lod.js';
import { Node } from './node.js';
import { Input } from './input.js';

export interface ChartContext {
	scene: Scene,
	autoLod: Signal<Period>;
	range: Signal<Range<Vec3>>;
}

export class Chart extends Node {
	/*
	axes: Axes;
	tickers: AutoTicker[];

	range = signal<Range<Vec3>>({
		min: new Vec3([-5000, -5000, -5000]),
		max: new Vec3([5000, 5000, 5000])
	});
	autoLod: Signal<Period>;

	settings;

	constructor(scene: Scene, provider: Provider) {
		super();
		this.autoLod = computed(() => getLod(scene.camera.eye.value.z));

		const ctx: ChartContext = {
			scene,
			autoLod: this.autoLod,
			range: this.range,
		};

		this.tickers = [ new AutoTicker(ctx, provider) ];
		this.axes = new Axes(ctx);
		this.settings = {
			axes: this.axes.settings,
		};
		effect(() => {
			const origin = this.axes.scaleOffset ?? new Vec3([0, 0, 0]);
			this.model = Mat4
				.translate(origin)
				.scale(this.axes.scale.value)
				.translate(origin.mulScalar(-1));
		});
		this.meshes = [ this.axes ];
		this.nodes = this.tickers;
	}

	update(dt: DOMHighResTimeStamp, input: Input) {
		this.axes.update(input);
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
 */
};
