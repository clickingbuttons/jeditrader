import { Material, MaterialOptions, defaultOptions } from './material.js';
import { axes, AxesResources as AR } from '@jeditrader/shaders';

export type AxesResources = AR.Mesh & AR.Axes;

const axesDefaultOptions = {
	...defaultOptions,
	depthWriteEnabled: false,
	cullMode: 'none',
} as Partial<MaterialOptions>;

export class AxesMaterial extends Material {
	constructor(device: GPUDevice, options: Partial<MaterialOptions> = axesDefaultOptions) {
		super(device, 'axes', axes.vert, axes.frag, axes.bindGroupLayouts, options);
	}
}
