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

export interface ChartContext {
	scene: Scene,
	autoLod: Signal<Period>;
	range: Signal<Range<Vec3>>;
}

export class Chart extends Scene {
	declare settings;

	axes: Axes;
	tickers: AutoTicker[] = [];

	scale = signal(new Vec3([1, 1, 1]));
	transform = {
		origin: undefined as Vec3 | undefined,
		scale: signal(this.scale.value.clone())
	};

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

		this.materials = {
			axes: Axes.material(this.device),
			mesh: this.materials.mesh,
		};

		this.axes = new Axes(
			this,
			this.range,
			computed(() => this.scale.value.mul(this.transform.scale.value)),
		);
		this.materials.axes.bind([this.axes]);

		const superSettings = this.settings as Scene['settings'];
		this.settings = {
			...superSettings,
			axes: this.axes.settings,
		};

		const { positions, indices } = new Cube().toIndexedTriangles();
		const mesh = new Mesh(this.device, positions, indices, {
			instances: {
				count: 1,
				stride: positions.length,
			}
		});
		this.modelInv.subscribe(inv => {
			const rad = 31536000000 / 2;
			const radius = new Vec4([rad, rad, rad, 1.0]).transform(inv);
			const c = new Cube(new Vec3([0, 0, 0]), new Vec3(radius));
			mesh.updatePositions(c.toIndexedTriangles().positions);
		});
		this.materials.mesh.bind([mesh]);

		this.tickers = [
			new AutoTicker(this, this.range, this.autoLod, provider),
		];
		this.materials.mesh.bind(Object.values(this.tickers[0].lods));

		this.range.subscribe(r => {
			const len = r.max.sub(r.min);
			const desiredHeight = len.x / this.aspectRatio.value;
			this.scale.value = new Vec3([1, desiredHeight / len.y, 1]);
		});

		effect(() => {
			const origin = this.transform.origin ?? new Vec3([0, 0, 0]);
			this.model.value = Mat4
				.translate(origin.mul(this.scale.value))
				.scale(this.scale.value.mul(this.transform.scale.value))
				.translate(origin.mulScalar(-1));
		});
	}

	update(dt: DOMHighResTimeStamp) {
		const input = this.input;

		document.body.style.cursor = input.buttons.shift ? 'ns-resize' : 'auto';
		if (input.buttons.mouse0 && input.buttons.shift) {
			if (!this.transform.origin) this.transform.origin = new Vec3([0, 10, 0]);

			const scale = new Vec3([0, -input.movementY * 2, 0])
				.mul(this.transform.scale.value)
				.divScalar(1e3);

			this.transform.scale.value = this.transform.scale.value.add(scale);
		} else {
			this.transform.origin = undefined;
		}
		super.update(dt);
	}

	render(pass: GPURenderPassEncoder) {
		super.render(pass);
		this.axes.render();
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
