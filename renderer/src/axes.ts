import { Camera } from './camera.js';
import { presentationFormat, sampleCount, createBuffer, align, depthFormat } from './util.js';
import { Range } from '@jeditrader/providers';
import { Vec3 } from './chart.js';
import { axes as code } from './shaders/index.js';

export class Axes {
	device: GPUDevice;
	pipeline: GPURenderPipeline;
	vertices?: GPUBuffer;
	verticesLow?: GPUBuffer;
	indices?: GPUBuffer;
	uniforms: GPUBuffer;
	horizontalLines: GPUBuffer;
	verticalLines: GPUBuffer;
	bindGroupLayout: GPUBindGroupLayout;
	bindGroup: GPUBindGroup;

	camera: Camera;
	range: Range<Vec3> = {
		min: [-5000, -5000, -5000],
		max: [5000, 5000, 5000]
	};

	constructor(device: GPUDevice, camera: Camera) {
		this.device = device;
		this.camera = camera;
		this.bindGroupLayout = device.createBindGroupLayout({
			entries: [
				{ binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
				{ binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'read-only-storage' } },
				{ binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'read-only-storage' } },
			]
		});
		this.pipeline = device.createRenderPipeline({
			layout: device.createPipelineLayout({
				bindGroupLayouts: [
					camera.gpu.bindGroupLayout,
					this.bindGroupLayout,
				]
			}),
			vertex: {
				module: device.createShaderModule({ code }),
				entryPoint: 'vert',
				buffers: [0, 1].map(i => ({
					arrayStride: 4 * 2,
					attributes: [{ format: 'float32x2', offset: 0, shaderLocation: i }]
				}))
			},
			fragment: {
				module: device.createShaderModule({ code }),
				entryPoint: 'frag',
				targets: [{ format: presentationFormat }],
			},
			depthStencil: {
				depthWriteEnabled: false,
				depthCompare: 'less',
				format: depthFormat,
			},
			primitive: {
				topology: 'line-list',
				cullMode: 'none',
			},
			multisample: { count: sampleCount },
		});

		const uniformData = [
			0.2, 0.2, 0.2, 1, // backgroundColor
			0, 0, 0, 1, // lineColor
			2, // lineThickness
		];
		const data = new Float32Array(align(uniformData.length, 4));
		data.set(uniformData);
		this.uniforms = createBuffer({
			device,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
			data,
		});
		this.horizontalLines = createBuffer({
			device,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
			data: new Float32Array([0]),
		});
		this.verticalLines = createBuffer({
			device,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
			data: new Float32Array([0]),
		});

		this.bindGroup = device.createBindGroup({
			layout: this.bindGroupLayout,
			entries: [
				{ binding: 0, resource: { buffer: this.uniforms } },
				{ binding: 1, resource: { buffer: this.horizontalLines } },
				{ binding: 2, resource: { buffer: this.verticalLines } },
			]
		});
	}

	getGeometry(range: Range<Vec3>) {
		const min = [range.min[0], range.min[1]];
		const max = [range.max[0], range.max[1]];
		const vertices = new Float64Array([
			min[0], min[1],
			min[0], max[1],
			max[0], max[1],

			max[0], min[1],
			min[0], min[1],
		]);
		const verticesLow = new Float32Array(vertices.map(v => v - Math.fround(v)));
		const indices = new Uint16Array([
			// 0, 1, 2,
			// 2, 3, 4,
			// For line-list debugging
			0, 1,
			1, 2,
			2, 0,
			2, 3,
			3, 0,
		]);

		return { vertices, verticesLow, indices };
	}

	updateGeometry(range: Range<Vec3>) {
		const { vertices, verticesLow, indices } = this.getGeometry(range);

		if (this.vertices) this.vertices.destroy();
		this.vertices = createBuffer({
			device: this.device,
			data: vertices,
		});
		if (this.verticesLow) this.verticesLow.destroy();
		this.verticesLow = createBuffer({
			device: this.device,
			data: verticesLow,
		});
		if (this.indices) this.indices.destroy();
		this.indices = createBuffer({
			device: this.device,
			usage: GPUBufferUsage.INDEX,
			data: indices,
			arrayTag: 'u16',
		});
	}

	updateLines() {
		this.horizontalLines = createBuffer({
			device: this.device,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
			data: new Float32Array([0]),
		});
		this.verticalLines = createBuffer({
			device: this.device,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
			data: new Float32Array([0]),
		});
		this.bindGroup = this.device.createBindGroup({
			layout: this.bindGroupLayout,
			entries: [
				{ binding: 0, resource: { buffer: this.uniforms } },
				{ binding: 1, resource: { buffer: this.horizontalLines } },
				{ binding: 2, resource: { buffer: this.verticalLines } },
			]
		});
	}

	setRange(newRange: Range<Vec3>) {
		this.updateGeometry(newRange);
		// this.updateLines();
	}

	render(pass: GPURenderPassEncoder): void {
		if (!this.vertices || !this.verticesLow || !this.indices) return;
		pass.setPipeline(this.pipeline);
		pass.setBindGroup(0, this.camera.gpu.bindGroup);
		pass.setBindGroup(1, this.bindGroup);
		pass.setVertexBuffer(0, this.vertices);
		pass.setVertexBuffer(1, this.verticesLow);
		// On most hardware, indexed triangle lists are the most efficient way to drive the GPU.
		// https://meshoptimizer.org/
		pass.setIndexBuffer(this.indices, 'uint16');
		pass.drawIndexed(this.indices.size / Uint16Array.BYTES_PER_ELEMENT);
	}
}
