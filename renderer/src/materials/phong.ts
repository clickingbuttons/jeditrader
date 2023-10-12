import { Material, MaterialOptions, defaultOptions } from './material.js';
import { basicVert, BasicVertResources, phongFrag, PhongFragResources } from '@jeditrader/shaders';

export type PhongResources = BasicVertResources.Mesh & PhongFragResources.Phong;

const bindGroupLayouts = {
	...basicVert.bindGroupLayouts,
	phong: phongFrag.bindGroupLayouts.phong,
};

export class PhongMaterial extends Material {
	constructor(device: GPUDevice, options: Partial<MaterialOptions> = defaultOptions) {
		super(device, 'phong', basicVert.code, phongFrag.code, bindGroupLayouts, options);
	}
};
