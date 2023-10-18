import { Material, MaterialOptions, defaultOptions } from './material.js';
import { lineVert, LineVertResources, basicFrag } from '@jeditrader/shaders';

export type LineResources =
	& LineVertResources.Line
;

const lineDefaultOptions = {
	...defaultOptions,
	topology: 'line-list',
} as Partial<MaterialOptions>;

export class LineMaterial extends Material {
	constructor(device: GPUDevice, options: Partial<MaterialOptions> = lineDefaultOptions) {
		super(
			device,
			'line',
			lineVert.code,
			basicFrag.code,
			lineVert.bindGroupLayouts,
			lineVert.vertexLayouts,
			options
		);
	}
}
