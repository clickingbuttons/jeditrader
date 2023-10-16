import { Material, MaterialOptions, defaultOptions } from './material.js';
import { basicVert, BasicVertResources, basicFrag } from '@jeditrader/shaders';

export type MeshResources =
	& BasicVertResources.Mesh
;

export class BasicMaterial extends Material {
	constructor(device: GPUDevice, options: Partial<MaterialOptions> = defaultOptions) {
		super(
			device,
			'basic',
			basicVert.code,
			basicFrag.code,
			basicVert.bindGroupLayouts,
			basicVert.vertexLayouts,
			options
		);
	}
}
