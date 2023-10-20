import { createBuffer, toF64, concatTypedArrays } from '../util.js';
import { Mat4, Vec3, Plane, Polygon } from '@jeditrader/linalg';
import { CSG } from '@jeditrader/geometry';
import { MeshResources } from '../materials/index.js';
import { Color } from '@jeditrader/geometry';

export interface MeshInstanceOptions {
	count: number;
	stride: number;
	models: Float64Array | number[];
	colors: Uint8Array | number[];
}

export interface MeshOptions {
	model: Float64Array | number[];
	colors: Uint8Array | number[];
	normals: Float32Array | number[];
	instances: Partial<MeshInstanceOptions>;
}

const defaultOptions: MeshOptions = {
	model: Mat4.identity(),
	colors: Color.white,
	normals: new Float32Array(new Vec3(0)),
	instances: {
		count: 1,
		stride: 0,
		models: Mat4.identity(),
		colors: new Color(255, 153, 153),
	}
};

function fillColors(colors: Uint8Array | number[], desiredLen: number): Uint8Array {
	if (colors.length >= desiredLen) return new Uint8Array(colors);

	const res = new Uint8Array(desiredLen).fill(255);
	res.set(new Uint8Array(colors));

	return res;
}

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
		this.device = device;

		this.resources = {
			strides: {
				buffer: createBuffer({
					device,
					usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
					data: new Uint32Array([instanceOpts.stride])
				}),
			},
			positions: {
				buffer: createBuffer({ device, data: toF64(positions) }),
			},
			indices: {
				buffer: createBuffer({ device, data: new Uint32Array(indices) }),
			},
			normals: {
				buffer: createBuffer({ device, data: new Float32Array(opts.normals) }),
			},
			inModel: {
				buffer: createBuffer({ device, data: toF64(opts.model) }),
			},
			models: {
				buffer: createBuffer({ device, data: toF64(instanceOpts.models) }),
			},
			colors: {
				buffer: createBuffer({ device, data: fillColors(opts.colors, positions.length * 4 / 3) }),
			},
			instanceColors: {
				buffer: createBuffer({ device, data: new Uint8Array(instanceOpts.colors) }),
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
		const opts = { ...defaultOptions, ...options };
		const { positions, indices, normals, colors } = csg.toIndexedTriangles();
		opts.normals = normals;
		opts.colors = colors;
		return new Mesh(device, positions, indices, opts);
	}

	static fromPlane(
		device: GPUDevice,
		plane: Plane,
		options: Partial<MeshOptions> = defaultOptions
	) {
		const opts = { ...defaultOptions, ...options };
		const [_, axes2, axes3] = plane.normal.basis();
		const positions = [1, 3, 5, 7]
			.map(n => n / 4 * Math.PI)
			.map(n => axes2.mulScalar(Math.sin(n)).add(axes3.mulScalar(Math.cos(n))))
			.reduce((acc, cur) => acc.concat(...cur), [] as number[]);
		opts.normals = [
			...plane.normal,
			...plane.normal,
			...plane.normal,
			...plane.normal,
		];
		opts.model = Mat4.translate(plane.point()).mul(new Mat4(opts.model));
		const indices = [1, 2, 0, 2, 3, 0];
		return new Mesh(device, positions, indices, opts);
	}

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
			offset * 16 * Float32Array.BYTES_PER_ELEMENT * 2,
			toF64(models)
		);
	}

	updateColors(colors: Uint8Array | number[], offset: number = 0) {
		this.device.queue.writeBuffer(
			this.resources.colors.buffer,
			offset * 4,
			new Uint8Array(colors)
		);
	}

	updateInstanceColors(colors: Uint8Array | number[], offset: number = 0) {
		this.device.queue.writeBuffer(
			this.resources.instanceColors.buffer,
			offset * 4,
			new Uint8Array(colors)
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
