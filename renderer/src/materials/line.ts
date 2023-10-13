import { Material, MaterialOptions, defaultOptions } from './material.js';
import { lineVert, LineVertResources, basicFrag } from '@jeditrader/shaders';

const bindGroupLayouts = lineVert.bindGroupLayouts;

const lineDefaultOptions = {
	...defaultOptions,
	topology: 'line-list',
} as Partial<MaterialOptions>;

export class LineMaterial extends Material {
	constructor(device: GPUDevice, options: Partial<MaterialOptions> = lineDefaultOptions) {
		super(device, 'line', lineVert.code, basicFrag.code, bindGroupLayouts, options);
	}
}
