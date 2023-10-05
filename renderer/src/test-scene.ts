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
	declare materials;

	constructor(renderer: Renderer) {
		super(renderer);
		const origin = new Date(0);
		const milliseconds = signal(lodKeys.map(name => getNext(origin, name).getTime()));

		const superSettings = this.settings as Scene['settings'];
		this.settings = {
			...superSettings,
			milliseconds,
			geometry: signal(true),
			transform: signal(true),
		};

		const superMaterials = this.materials as Scene['materials'];
		this.materials = {
			...superMaterials,
			error: new Material(this.device, {
				bindings: Object.values(Mesh.bindGroup),
				vertCode: `
let pos = projected(arg);
return VertexOutput(pos.proj, pos.view);
				`
			}),
		};
		const material = this.materials.error;

		const offset = new Date(2020, 1).getTime();

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
					[
						new Cube({ radius }),
						new Cube({ center: new Vec3(offset, 0, 0), radius }),
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
					const radius = ms;

					const scale = Mat4.scale(new Vec3(radius, radius, radius))
					const translate = Mat4.translate(new Vec3(offset, 0, 0))

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
			material.bind(...meshes);
			this.flags.rerender = true;
		});

		material.toggleWireframe();
	}
};
