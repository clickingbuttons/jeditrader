import { Material, MaterialOptions, defaultOptions } from './material.js';
import { normalsVert, basicFrag } from '@jeditrader/shaders';

const normalsDefaultOptions = {
	...defaultOptions,
	topology: 'line-list',
} as Partial<MaterialOptions>;

export class NormalsMaterial extends Material {
	constructor(device: GPUDevice, options: Partial<MaterialOptions> = normalsDefaultOptions) {
		super(
			device,
			'normals',
			normalsVert.code,
			basicFrag.code,
			normalsVert.bindGroupLayouts,
			normalsVert.vertexLayouts,
			options
		);
	}
}
