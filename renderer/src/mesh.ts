import { createBuffer } from './util.js';
import { BufferBinding } from './shader-binding.js';
import { Mat4 } from '@jeditrader/linalg';

function f32Low(n: number) {
	return n - Math.fround(n);
}

function toF64(nums: number[]): number[] {
	return nums.reduce((acc, cur) => {
		acc.push(cur, f32Low(cur));
		return acc;
	}, [] as number[]);
}

export interface MeshInstanceOptions {
	count: number;
	stride: number;
	models: number[];
	colors: number[];
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
		models: [...Mat4.identity()],
		colors: [1, .6, .6, 1],
	}
};

export class Mesh {
	device: GPUDevice;

	static bindGroups = [
		new BufferBinding('strides', null, { wgslStruct: `struct Strides {
			instance: u32,
			vertex: u32,
		}`}),
		new BufferBinding('positions', null, { wgslType: 'array<f64>' }),
		new BufferBinding('indices', null, { wgslType: 'array<u32>' }),
		new BufferBinding('models', null, { wgslType: 'array<array<f64, 16>>' }),
		new BufferBinding('colors', null, { wgslType: 'array<vec4f>' }),
	];
	strides: GPUBuffer;
	positions: GPUBuffer;
	indices: GPUBuffer;

	// instances
	nInstances: number;
	models: GPUBuffer;
	colors: GPUBuffer;

	constructor(
		device: GPUDevice,
		positions: number[],
		indices: number[],
		options: Partial<MeshOptions> = defaultOptions
	) {
		const instanceOpts = { ...defaultOptions.instances, ...options.instances } as MeshInstanceOptions;
		const opts = { ...defaultOptions, ...options };
		const strides: number[] = [instanceOpts.stride, opts.vertexStride];
		this.device = device;

		this.strides = createBuffer({ device, data: new Uint32Array(strides) });
		this.positions = createBuffer({ device, data: new Float32Array(toF64(positions)) });
		this.indices = createBuffer({ device, data: new Uint32Array(indices) });
		this.models = createBuffer({ device, data: new Float32Array(toF64(instanceOpts.models)) });
		this.colors = createBuffer({ device, data: new Float32Array(instanceOpts.colors) });

		this.nInstances = instanceOpts.count;
	}

	updatePositions(positions: number[], offset: number = 0) {
		this.device.queue.writeBuffer(this.positions, offset, new Float32Array(toF64(positions)));
	}

	destroy() {
		this.positions.destroy();
		this.indices.destroy();
		this.strides.destroy();
	}
}
