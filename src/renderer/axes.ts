import { Camera } from './camera';
import { presentationFormat, sampleCount, createBuffer, Bounds, align } from './util';
import code from '../shaders/axes.wgsl';

const vertices = (bounds: Bounds) => new Float64Array([
	bounds.x.min, bounds.y.min, 0,
	bounds.x.max, bounds.y.min, 0,
	bounds.x.max, bounds.y.max, 0,
	bounds.x.min, bounds.y.max, 0,
]);
const indices = new Uint16Array([
	0, 1,
	2, 2,
	3, 0
]);
export const minCellSize = 0.001;

export class Axes {
	device: GPUDevice;
	camera: Camera;
	pipeline: GPURenderPipeline;
	vertexBuffer: GPUBuffer;
	vertexBufferLow: GPUBuffer;
	indexBuffer: GPUBuffer;
	bounds: Bounds = {
		x: { min: 0, max: 0 },
		y: { min: 0, max: 0 },
		z: { min: 0, max: 0 },
	};
	uniformBuffer: GPUBuffer;
	bindGroup: GPUBindGroup;

	constructor(device: GPUDevice, camera: Camera) {
		this.device = device;
		this.camera = camera;
		const bindGroupLayout = device.createBindGroupLayout({
			label: 'axes bind group layout',
			entries: [
				{
					binding: 0,
					visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
					buffer: { type: 'uniform' }
				}
			]
		});
		this.pipeline = device.createRenderPipeline({
			label: 'axes pipeline',
			layout: device.createPipelineLayout({
				label: 'axes pipeline layout',
				bindGroupLayouts: [
					camera.gpu.bindGroupLayout,
					bindGroupLayout,
				]
			}),
			vertex: {
				module: device.createShaderModule({ code }),
				entryPoint: 'vert',
				buffers: [0, 1].map(i => ({
					arrayStride: 4 * 3,
					attributes: [{ format: 'float32x3', offset: 0, shaderLocation: i }]
				}))
			},
			fragment: {
				module: device.createShaderModule({ code }),
				entryPoint: 'frag',
				targets: [{ format: presentationFormat }],
			},
			// depthStencil: {
			// 	depthWriteEnabled: false,
			// 	depthCompare: 'less',
			// 	format: 'depth24plus',
			// },
			primitive: {
				topology: 'triangle-strip',
				stripIndexFormat: 'uint16',
				cullMode: 'none',
			},
			multisample: { count: sampleCount },
		});

		this.indexBuffer = createBuffer({
			device,
			usage: GPUBufferUsage.INDEX,
			data: indices,
			arrayTag: 'u16',
			label: 'ohlcv index buffer',
		});

		const uniformData = [
			0.2, 0.2, 0.2, 1, // colorThin
			0, 0, 0, 1, // colorThick
			minCellSize,
			2, // minPixelsBetweenCells
		];
		const data = new Float32Array(align(uniformData.length, 4));
		data.set(uniformData);
		this.uniformBuffer = createBuffer({
			device,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
			data,
			label: 'axes uniform buffer',
		});
		this.bindGroup = device.createBindGroup({
			label: 'axes bind group',
			layout: bindGroupLayout,
			entries: [{
				binding: 0,
				resource: { buffer: this.uniformBuffer }
			}]
		});
		this.setBounds(this.bounds);
	}

	setBounds(bounds?: Bounds) {
		if (!bounds) return;
		this.bounds = bounds;

		const vertices64 = vertices(bounds);
		const vertices32 = new Float32Array(vertices64);
		const verticesLow = vertices64.map((v, i) => v - vertices32[i]);
		this.vertexBuffer = createBuffer({
			device: this.device,
			data: vertices32,
			label: 'ohlcv vertex buffer'
		});
		this.vertexBufferLow = createBuffer({
			device: this.device,
			data: new Float32Array(verticesLow),
			label: 'ohlcv vertex buffer low'
		});
		console.log(vertices32, new Float32Array(verticesLow))
	}

	render(pass: GPURenderPassEncoder): void {
		if (!this.vertexBuffer || !this.vertexBufferLow) return;
		pass.setPipeline(this.pipeline);
		pass.setBindGroup(0, this.camera.gpu.bindGroup);
		pass.setBindGroup(1, this.bindGroup);
		pass.setVertexBuffer(0, this.vertexBuffer);
		pass.setVertexBuffer(1, this.vertexBufferLow);
		pass.setIndexBuffer(this.indexBuffer, 'uint16');
		pass.drawIndexed(indices.length);
	}
}
