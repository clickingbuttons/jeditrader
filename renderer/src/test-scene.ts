import { lodKeys } from './lod.js';
import { getNext } from '@jeditrader/providers';
import { Mesh } from './mesh.js';
import { Cube } from '@jeditrader/geometry';
import { Vec3, Mat4 } from '@jeditrader/linalg';
import { Scene } from './scene.js';
import { Renderer } from './renderer.js';
import { signal } from '@preact/signals-core';

export class TestScene extends Scene {
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
		this.settings.milliseconds = milliseconds;

		milliseconds.subscribe(mss => {
			const allPositions: number[] = [];
			const allIndices: number[] = [];
			let nInstances = 0;
			let instanceStride = 0;

			mss.forEach(ms => {
				const radius = ms / 2;
				const rad3 = new Vec3([radius, radius, radius]);

				[
					new Cube(new Vec3([0, 0, 0]), rad3),
					new Cube(new Vec3([new Date(2010, 1, 1).getTime(), 0, 0]), rad3)
				].forEach(csg => {
					const { positions, indices } = csg.toIndexedTriangles();
					allPositions.push(...positions);
					allIndices.push(...indices);
					instanceStride = positions.length;
					nInstances += 1;
				});
			});

			const mesh0 = new Mesh(this.device, allPositions, allIndices, {
				instances: {
					count: nInstances,
					stride: instanceStride,
				}
			});

			const models = mss.map(ms => {
				const radius = ms / 2;

				const scale = Mat4.scale(new Vec3([radius, radius, radius]))
				const translate = Mat4.translate(new Vec3([new Date(2010, 1, 1).getTime(), 0, 0]))

				return [...scale, ...translate.mul(scale)];
			}).flat();

			const indexed = new Cube().toIndexedTriangles();
			const mesh1 = new Mesh(this.device, indexed.positions, indexed.indices, {
				instances: {
					count: mss.length,
					models,
					colors: [0, 1, 0, 1],
				}
			});

			this.materials.default.destroy();
			this.materials.default.bind([mesh1, mesh0]);
			this.flags.rerender = true;
		});

		this.materials.default.toggleWireframe();
	}
};
