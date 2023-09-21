import { createBuffer } from './util.js';
import { BufferBinding } from './shader-binding.js';

function f32Low(n: number) {
	return n - Math.fround(n);
}

export interface MeshOptions {
	vertexStride: number;
	instanceStride: number;
	nInstances: number;
}

const defaultOptions: MeshOptions = {
	vertexStride: 3,
	instanceStride: 0,
	nInstances: 1,
};

export class Mesh {
	device: GPUDevice;

	static bindGroups = [
		new BufferBinding('positions', null),
		new BufferBinding('positionsLow', null),
		new BufferBinding('indices', null, { wgslType: 'array<u32>' }),
		new BufferBinding('strides', null, { wgslStruct: `struct Strides {
			instance: u32,
			vertex: u32,
		}`}),
	];
	positions: GPUBuffer;
	positionsLow: GPUBuffer;
	indices: GPUBuffer;
	strides: GPUBuffer;

	nInstances: number;

	constructor(
		device: GPUDevice,
		positions: number[],
		indices: number[],
		options: Partial<MeshOptions> = defaultOptions
	) {
		const opts = { ...defaultOptions, ...options };
		this.device = device;
		this.positions = createBuffer({ device, data: new Float32Array(positions) });
		this.positionsLow = createBuffer({ device, data: new Float32Array(positions.map(f32Low)) });
		this.indices = createBuffer({ device, data: new Uint32Array(indices) });
		const strides = [opts.instanceStride, opts.vertexStride];
		this.strides = createBuffer({ device, data: new Uint32Array(strides) });

		this.nInstances = opts.nInstances;
	}

	updatePositions(positions: number[], offset: number = 0) {
		this.device.queue.writeBuffer(this.positions, offset, new Float32Array(positions));
		this.device.queue.writeBuffer(this.positionsLow, offset, new Float32Array(positions.map(f32Low)));
	}

	destroy() {
		this.positions.destroy();
		this.positionsLow.destroy();
		this.indices.destroy();
		this.strides.destroy();
	}
}
