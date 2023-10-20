import { Mesh } from '../meshes/index.js';
import { Renderer } from '../renderer.js';
import { OrbitController  } from '../camera/index.js';
import { Cone, Circle, Sphere, Cube, Vertex } from '@jeditrader/geometry';
import { Vec3, Mat4, Plane } from '@jeditrader/linalg';
import { Scene } from './scene.js';
import { signal, effect, computed } from '@preact/signals-core';
import type { Material } from '../materials/index.js';
import { Color } from '@jeditrader/geometry';

export class Modeler extends Scene {
	declare settings;

	constructor(renderer: Renderer) {
		super(renderer);

		this.cameraController = new OrbitController(this.camera);

		const superSettings = this.settings as Scene['settings'];
		this.settings = {
			...superSettings,
			material: { val: signal('phong'), options: Object.keys(this.materials) },
			center: signal(new Vec3(0, 0, 0)),
			radius: signal(.5),
		};

		// const mesh = computed(() => Mesh.fromPlane(this.device, new Plane(
		// 	new Vec3(0, 0, 1).normalize(),
		// 	new Vec3(0, 0, 0),
		// )));

		const mesh = computed(() => {
			const opts = {
				center: this.settings.center.value,
				radius: this.settings.radius.value,
				height: this.settings.radius.value,
			};
			const res = Mesh.fromCSG(this.device, new Cube(opts), {
				instances: {
					colors: new Color(255, 255, 0),
				}
			});

			return res;
		});

		let lastMesh = mesh.value;
		let lastMaterial: Material | undefined;

		effect(() => {
			const material = this.materials[this.matKey()];
			if (!material) return;

			lastMaterial?.unbind(lastMesh);
			material.bind(mesh.value);

			lastMaterial = material;
			lastMesh = mesh.value;

			this.flags.rerender = true;
		});
	}

	matKey(): keyof typeof this.materials {
		return this.settings.material.val.value as keyof typeof this.materials;
	}
};
