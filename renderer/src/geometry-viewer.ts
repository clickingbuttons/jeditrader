import { lodKeys } from './lod.js';
import { getNext } from '@jeditrader/providers';
import { Mesh } from './mesh.js';
import { Cube } from '@jeditrader/geometry';
import { Vec3, Mat4 } from '@jeditrader/linalg';
import { Scene } from './scene.js';
import { Renderer } from './renderer.js';
import { signal, effect } from '@preact/signals-core';
import { Material } from './material.js';

export class GeometryViewer extends Scene {
	declare settings;
	declare materials;

	constructor(renderer: Renderer) {
		super(renderer);

		const superSettings = this.settings as Scene['settings'];
		this.settings = {
			...superSettings,
			material: signal('default'),
			center: signal(new Vec3(0, 0, 0)),
			radius: signal(.5),
		};

		effect(() => {
			const material = this.materials[this.settings.material.value as keyof typeof this.materials];
			if (!material) return;

			const opts = {
				center: this.settings.center.value,
				radius: this.settings.radius.value,
			};
			const { positions, indices } = new Cube(opts).toIndexedTriangles();
			const mesh = new Mesh(this.device, positions, indices);

			material.destroy();
			material.bind(mesh);
			this.flags.rerender = true;
		});
	}
};
