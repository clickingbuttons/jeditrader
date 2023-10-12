import { Mesh } from '../meshes/index.js';
import { Renderer } from '../renderer.js';
import { OrbitController  } from '../camera/index.js';
import { Cone, Circle, Sphere, Cube, Vertex } from '@jeditrader/geometry';
import { Vec3, Vec4, Mat4 } from '@jeditrader/linalg';
import { Scene } from './scene.js';
import { signal, effect, computed } from '@preact/signals-core';
import { createBuffer } from '../util.js';
import type { Material, PhongResources } from '../materials/index.js';

export class Modeler extends Scene {
	declare settings;

	constructor(renderer: Renderer) {
		super(renderer);

		// this.cameraController = new OrbitController(this.camera);

		const superSettings = this.settings as Scene['settings'];
		this.settings = {
			...superSettings,
			material: { val: signal('phong'), options: Object.keys(this.materials) },
			center: signal(new Vec3(0, 0, 0)),
			radius: signal(.5),
			phong: {
				ambientColor: signal(new Vec4(0, 1, 0, .1)),
			}
		};

		const phongResources ={
			phong: {
				buffer: createBuffer({
					device: this.device,
					usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
					data: this.phongData(),
				})
			}
		};
		effect(() => {
			this.device.queue.writeBuffer(phongResources.phong.buffer, 0, this.phongData());
			this.flags.rerender = true;
		});

		const maxNormals = 1000;
		const normalMesh = Mesh.fromCSG(this.device, new Cone(), {
			model: Mat4.scale(new Vec3(.1)),
			instances: {
				models: new Float64Array(16 * maxNormals),
			}
		});
		const normalMaterial = this.materials.default;
		normalMaterial.bind(normalMesh);

		const mesh = computed(() => {
			const opts = {
				center: this.settings.center.value,
				radius: this.settings.radius.value,
				height: this.settings.radius.value,
			};
			const { positions, indices, normals } = new Sphere().toIndexedTriangles();
			const res = new Mesh(this.device, positions, indices, {
				normals,
				instances: {
					colors: [1, 1, 0, 1]
				}
			});
			res.resources.phong = phongResources.phong;

			for (let i = 0; i < positions.length; i += 3) {
				const x = i + 0;
				const y = i + 1;
				const z = i + 2;
				const pos = new Vec3(positions[x], positions[y], positions[z]).mulScalar(1 / .1);
				const norm = new Vec3(normals[x], normals[y], normals[z]);
				console.log(pos, norm)

				const model = Mat4
					.translate(pos)
					.rotate(new Vec3(1, 0, 0), -Math.PI / 2);
				normalMesh.updateModels([...model], i);
			}
			console.log(positions.length)
			normalMesh.nInstances = positions.length;
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

	phongData() {
		const phong = this.settings.phong;
		return new Float32Array([
			...phong.ambientColor.value,
		]);
	}
};
