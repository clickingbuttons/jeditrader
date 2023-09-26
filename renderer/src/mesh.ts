import { createBuffer, toF64 } from './util.js';
import { BufferBinding } from './shader-binding.js';
import { Mat4 } from '@jeditrader/linalg';

export interface MeshInstanceOptions {
	count: number;
	stride: number;
	models: Float64Array | number[];
	colors: Float32Array | number[];
}

export interface MeshOptions {
	vertexStride: number;
	instances: Partial<MeshInstanceOptions>;
}

const defaultOptions: MeshOptions = {
	vertexStride: 3,
	instances: {
		count: 1,
		stride: 0,
		models: Mat4.identity(),
		colors: new Float32Array([1, .6, .6, 1]),
	}
};

export class Mesh {
	device: GPUDevice;

	static bindGroup = {
		strides: new BufferBinding('strides', { wgslStruct: `struct Strides {
			instance: u32,
			vertex: u32,
		}`}),
		positions: new BufferBinding('positions', { wgslType: 'array<f64>' }),
		indices: new BufferBinding('indices', { wgslType: 'array<u32>' }),
		models: new BufferBinding('models', { wgslType: 'array<array<f64, 16>>' }),
		colors: new BufferBinding('colors', { wgslType: 'array<vec4f>' }),
	};
	buffers: { [s: string]: GPUBuffer };

	nIndices: number;
	nInstances: number;

	constructor(
		device: GPUDevice,
		positions: Float64Array | number[],
		indices: Uint32Array | number[],
		options: Partial<MeshOptions> = defaultOptions
	) {
		const instanceOpts = { ...defaultOptions.instances, ...options.instances } as MeshInstanceOptions;
		const opts = { ...defaultOptions, ...options };
		const strides: number[] = [instanceOpts.stride, opts.vertexStride];
		this.device = device;

		this.buffers = {
			strides: createBuffer({ device, data: new Uint32Array(strides) }),
			positions: createBuffer({ device, data: toF64(positions) }),
			indices: createBuffer({ device, data: new Uint32Array(indices) }),
			models: createBuffer({ device, data: toF64(instanceOpts.models) }),
			colors: createBuffer({ device, data: new Float32Array(instanceOpts.colors) }),
		};

		this.nIndices = indices.length;
		this.nInstances = instanceOpts.count;
	}

	updatePositions(positions: Float64Array | number[], offset: number = 0) {
		this.device.queue.writeBuffer(
			this.buffers.positions,
			offset,
			toF64(positions)
		);
	}

	updateModels(models: Float64Array | number[], offset: number = 0) {
		this.device.queue.writeBuffer(
			this.buffers.models,
			offset * 16 * 2 * Float32Array.BYTES_PER_ELEMENT,
			toF64(models)
		);
	}

	updateColors(colors: Float32Array | number[], offset: number = 0) {
		this.device.queue.writeBuffer(
			this.buffers.colors,
			offset * 4 * Float32Array.BYTES_PER_ELEMENT,
			new Float32Array(colors)
		);
	}

	destroy() {
		Object.values(this.buffers).forEach(b => b.destroy());
	}
}
