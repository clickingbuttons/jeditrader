import { Material, MaterialOptions, defaultOptions } from './material.js';
import { axesVert, AxesVertResources, axesFrag, AxesFragResources } from '@jeditrader/shaders';

export type AxesResources =
	& AxesVertResources.Mesh
	& AxesFragResources.Axes;

const bindGroupLayouts = {
	...axesVert.bindGroupLayouts,
	...axesFrag.bindGroupLayouts,
};

const axesDefaultOptions = {
	...defaultOptions,
	depthWriteEnabled: false,
	cullMode: 'none',
} as Partial<MaterialOptions>;

export class AxesMaterial extends Material {
	constructor(device: GPUDevice, options: Partial<MaterialOptions> = axesDefaultOptions) {
		super(
			device,
			'axes',
			axesVert.code,
			axesFrag.code,
			bindGroupLayouts,
			axesVert.vertexLayouts,
			options
		);
	}
}
