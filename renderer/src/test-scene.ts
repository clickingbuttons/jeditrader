import { lodKeys } from './lod.js';
import { getNext } from '@jeditrader/providers';
import { Mesh } from './mesh.js';
import { Cube } from '@jeditrader/geometry';
import { Vec3, Mat4 } from '@jeditrader/linalg';
import { Scene } from './scene.js';
import { Renderer } from './renderer.js';
import { signal, effect } from '@preact/signals-core';
import { Material } from './material.js';

export class TestScene extends Scene {
	declare settings;

	constructor(renderer: Renderer) {
		super(renderer);
		const origin = new Date(0);
		const milliseconds = signal(lodKeys.map(name => getNext(origin, name).getTime()));

		this.camera.eye.value = new Vec3([
			649252057699.8112,
			-196524753900.5597,
			589981060393.1589,
		]);
		this.camera.pitch.value = -1.3;
		this.camera.yaw.value = 0.018;
		const superSettings = this.settings as Scene['settings'];
		this.settings = {
			...superSettings,
			milliseconds,
			geometry: signal(true),
			transform: signal(true),
		};

		this.materials.errorMaterial = new Material(this.device, {
			bindings: Object.values(Mesh.bindGroup),
			vertCode: `
let pos = position64(arg);
return VertexOutput(pos.proj, toVec4(pos.scene));
			`
		});
		const material = this.materials.errorMaterial;

		effect(() => {
			const mss: number[] = this.settings.milliseconds.value;
			const meshes: Mesh[] = [];

			if (this.settings.geometry.value) {
				const allPositions: number[] = [];
				const allIndices: number[] = [];
				let nInstances = 0;
				let instanceStride = 0;

				mss.forEach(ms => {
					const radius = ms / 2;
					const rad3 = new Vec3([radius, radius, radius]);

					[
						new Cube(new Vec3([0, 0, 0]), rad3),
						new Cube(new Vec3([new Date(2010, 1, 1).getTime(), 0, 0]), rad3),
					].forEach(csg => {
						const { positions, indices } = csg.toIndexedTriangles();
						allPositions.push(...positions);
						allIndices.push(...indices);
						instanceStride = positions.length;
						nInstances += 1;
					});
				});

				meshes.push(new Mesh(this.device, allPositions, allIndices, {
					instances: {
						count: nInstances,
						stride: instanceStride,
					}
				}));
			}

			if (this.settings.transform.value) {
				const models = mss.map(ms => {
					const radius = ms / 2;

					const scale = Mat4.scale(new Vec3([radius, radius, radius]))
					const translate = Mat4.translate(new Vec3([new Date(2010, 1, 1).getTime(), 0, 0]))

					return [...scale, ...translate.mul(scale)];
				}).flat();

				const indexed = new Cube().toIndexedTriangles();
				meshes.push(new Mesh(this.device, indexed.positions, indexed.indices, {
					instances: {
						count: models.length / 16,
						models,
						colors: [0, 1, 0, 1],
					}
				}));
			}

			material.destroy();
			material.bind(meshes);
			this.flags.rerender = true;
		});

		material.toggleWireframe();
	}
};
