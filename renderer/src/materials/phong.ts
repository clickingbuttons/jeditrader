import { Material, MaterialOptions, defaultOptions } from './material.js';
import { basicVert, BasicVertResources, phongFrag } from '@jeditrader/shaders';

export type PhongResources =
	& BasicVertResources.Mesh
;

export class PhongMaterial extends Material {
	constructor(device: GPUDevice, options: Partial<MaterialOptions> = defaultOptions) {
		super(
			device,
			'phong',
			basicVert.code,
			phongFrag.code,
			basicVert.bindGroupLayouts,
			basicVert.vertexLayouts,
			options
		);
	}
};
