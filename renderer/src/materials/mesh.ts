import { Material, MaterialOptions, defaultOptions } from './material.js';
import { basic, BasicResources } from '@jeditrader/shaders';

export type MeshResources = BasicResources.Mesh;

export class MeshMaterial extends Material {
	constructor(device: GPUDevice, options: Partial<MaterialOptions> = defaultOptions) {
		super(device, 'mesh', basic.vert, basic.frag, basic.bindGroupLayouts, options);
	}
};
