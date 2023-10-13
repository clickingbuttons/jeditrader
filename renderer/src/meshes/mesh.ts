import { createBuffer, toF64 } from '../util.js';
import { Mat4, Vec3 } from '@jeditrader/linalg';
import { CSG, Plane } from '@jeditrader/geometry';
import { MeshResources } from '../materials/index.js';

export interface MeshInstanceOptions {
	count: number;
	stride: number;
	models: Float64Array | number[];
	colors: Float32Array | number[];
}

export interface MeshOptions {
	vertexStride: number;
	model: Float64Array | number[];
	normals: Float32Array | number[];
	instances: Partial<MeshInstanceOptions>;
}

const defaultOptions: MeshOptions = {
	vertexStride: 3,
	model: Mat4.identity(),
	normals: new Float32Array(new Vec3(0)),
	instances: {
		count: 1,
		stride: 0,
		models: Mat4.identity(),
		colors: new Float32Array([1, .6, .6, 1]),
	}
};

export class Mesh {
	device: GPUDevice;
	resources: MeshResources;

	nIndices: number;
	nInstances: number;
	visible = true;

	constructor(
		device: GPUDevice,
		positions: Float64Array | number[],
		indices: Uint32Array | number[],
		options: Partial<MeshOptions> = defaultOptions
	) {
		const instanceOpts = { ...defaultOptions.instances, ...options.instances } as MeshInstanceOptions;
		const opts = { ...defaultOptions, ...options };
		const strides = [instanceOpts.stride, opts.vertexStride];
		this.device = device;

		this.resources = {
			strides: {
				buffer: createBuffer({ device, data: new Uint32Array(strides) }),
			},
			positions: {
				buffer: createBuffer({ device, data: toF64(positions) }),
			},
			normals: {
				buffer: createBuffer({ device, data: new Float32Array(opts.normals) }),
			},
			indices: {
				buffer: createBuffer({ device, data: new Uint32Array(indices) }),
			},
			inModel: {
				buffer: createBuffer({ device, data: toF64(opts.model) }),
			},
			models: {
				buffer: createBuffer({ device, data: toF64(instanceOpts.models) }),
			},
			colors: {
				buffer: createBuffer({ device, data: new Float32Array(instanceOpts.colors) }),
			},
		};

		this.nIndices = indices.length;
		this.nInstances = instanceOpts.count;
	}

	static fromCSG(
		device: GPUDevice,
		csg: CSG,
		options: Partial<MeshOptions> = defaultOptions
	) {
		const { positions, indices, normals } = csg.toIndexedTriangles();
		options.normals = normals;
		return new Mesh(device, positions, indices, options);
	}

	// static fromPlane(
	// 	device: GPUDevice,
	// 	plane: Plane,
	// 	options: Partial<MeshOptions> = defaultOptions
	// ) {
	// 	const csg = new Cone(plane.point);
	// 	const { positions, indices } = csg.toIndexedTriangles();
	// 	return new Mesh(device, positions, indices, options);
	// }

	updatePositions(positions: Float64Array | number[], offset: number = 0) {
		this.device.queue.writeBuffer(
			this.resources.positions.buffer,
			offset,
			toF64(positions)
		);
	}

	updateNormals(normals: Float32Array | number[], offset: number = 0) {
		this.device.queue.writeBuffer(
			this.resources.normals.buffer,
			offset,
			new Float32Array(normals)
		);
	}

	updateModel(model: Float64Array | number[]) {
		this.device.queue.writeBuffer(
			this.resources.inModel.buffer,
			0,
			toF64(model)
		);
	}

	updateModels(models: Float64Array | number[], offset: number = 0) {
		this.device.queue.writeBuffer(
			this.resources.models.buffer,
			offset * 16 * 2 * Float32Array.BYTES_PER_ELEMENT,
			toF64(models)
		);
	}

	updateColors(colors: Float32Array | number[], offset: number = 0) {
		this.device.queue.writeBuffer(
			this.resources.colors.buffer,
			offset * 4 * Float32Array.BYTES_PER_ELEMENT,
			new Float32Array(colors)
		);
	}

	draw(pass: GPURenderPassEncoder, wireframe: boolean) {
		if (this.nIndices === 0 || this.nInstances === 0 || !this.visible) return;
		pass.draw(wireframe ? this.nIndices * 2 : this.nIndices, this.nInstances);
	}

	destroy() {
		Object.values(this.resources)
			.forEach(b => {
				if ('buffer' in b) b.buffer.destroy();
			});
	}
}
