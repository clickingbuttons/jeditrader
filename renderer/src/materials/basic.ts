import { Material, MaterialOptions, defaultOptions } from './material.js';
import { basicVert, BasicVertResources, basicFrag } from '@jeditrader/shaders';

export type MeshResources = BasicVertResources.Mesh;

const bindGroupLayouts = basicVert.bindGroupLayouts;

export class BasicMaterial extends Material {
	constructor(device: GPUDevice, options: Partial<MaterialOptions> = defaultOptions) {
		super(device, 'basic', basicVert.code, basicFrag.code, bindGroupLayouts, options);
	}
}
