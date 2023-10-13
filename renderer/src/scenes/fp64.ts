import { lodKeys } from '../lod.js';
import { getNext } from '@jeditrader/providers';
import { Mesh } from '../meshes/mesh.js';
import { Cube } from '@jeditrader/geometry';
import { Vec3, Mat4 } from '@jeditrader/linalg';
import { Scene } from './scene.js';
import { Renderer } from '../renderer.js';
import { signal, effect } from '@preact/signals-core';
import { Color } from '../color.js';

// Verifies can zoom from years to milliseconds
export class Fp64Scene extends Scene {
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
			geometry: signal(false),
			transform: signal(true),
		};

		const superMaterials = this.materials as Scene['materials'];
		this.materials = {
			...superMaterials,
			/*
			error: new Material(this.device, {
				bindings: Object.values(Mesh.bindGroup),
				vertCode: `
let pos = projected(arg);
return VertexOutput(pos.proj, pos.view);
				`
			}),
			*/
		};
		const material = this.materials.default;

		const offset = new Date(2020, 1).getTime();

		effect(() => {
			const meshes: Mesh[] = [];

			if (this.settings.geometry.value) meshes.push(...this.getGeometryMeshes(offset));
			if (this.settings.transform.value) meshes.push(this.getTransformMesh(offset));

			material.unbindAll();
			material.bind(...meshes);
			this.flags.rerender = true;
		});

		this.fitInView({
			min: new Vec3(0, 0, 0),
			max: new Vec3(offset, 0, 0)
		});
		// this.toggleWireframe();
	}

	getGeometryMeshes(offset: number): Mesh[] {
		return this.settings.milliseconds.value
			.map(ms => {
				const radius = ms / 2;
				return [
					new Cube({ radius }),
					new Cube({ center: new Vec3(offset, 0, 0), radius }),
				].map(csg => Mesh.fromCSG(this.device, csg))
			})
			.flat();
	}

	getTransformMesh(offset: number): Mesh {
		const models = this.settings.milliseconds.value.map(ms => {
			const radius = ms;

			const scale = Mat4.scale(new Vec3(radius, radius, radius))
			const translate = Mat4.translate(new Vec3(offset, 0, 0))

			return [...scale, ...translate.mul(scale)];
		}).flat();
		const nInstances = models.length / 16;
		const colors = new Uint8Array(4 * nInstances);
		for (let i = 0; i < colors.length; i += 4) colors.set(Color.green, i);

		return Mesh.fromCSG(this.device, new Cube(), {
			instances: {
				count: nInstances,
				models,
				colors,
			}
		});
	}
};
