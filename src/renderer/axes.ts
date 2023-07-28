import { Camera } from './camera';
import { presentationFormat, sampleCount, createBuffer, Bounds } from './util';
import code from '../shaders/axes.wgsl';

const vertices = (bounds: Bounds) => new Float32Array([
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
				buffers: [
					{
						arrayStride: 4 * 3,
						attributes: [{ format: 'float32x3', offset: 0, shaderLocation: 0 }]
					},
				],
			},
			fragment: {
				module: device.createShaderModule({ code }),
				entryPoint: 'frag',
				targets: [{ format: presentationFormat }],
			},
			depthStencil: {
				depthWriteEnabled: false,
				depthCompare: 'less',
				format: 'depth24plus',
			},
			primitive: {
				topology: 'triangle-strip',
				stripIndexFormat: 'uint16',
				cullMode: 'none',
			},
			multisample: { count: sampleCount },
		});

		this.vertexBuffer = createBuffer({
			device,
			data: vertices(this.bounds),
			label: 'ohlcv vertex buffer'
		});
		this.indexBuffer = createBuffer({
			device,
			usage: GPUBufferUsage.INDEX,
			data: indices,
			arrayTag: 'u16',
			label: 'ohlcv index buffer',
		});

		const data = new Float32Array(64); // Must be multiple of of 16
		data.set([
			0.2, 0.2, 0.2, 1, // colorThin
			0, 0, 0, 1, // colorThick
			minCellSize,
			2, // minPixelsBetweenCells
		]);
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
	}

	setBounds(bounds?: Bounds) {
		if (!bounds) return;

		this.bounds = bounds;
		this.vertexBuffer = createBuffer({
			device: this.device,
			data: vertices(bounds),
			label: 'ohlcv vertex buffer'
		});
	}

	render(pass: GPURenderPassEncoder): void {
		pass.setPipeline(this.pipeline);
		pass.setBindGroup(0, this.camera.gpu.bindGroup);
		pass.setBindGroup(1, this.bindGroup);
		pass.setVertexBuffer(0, this.vertexBuffer);
		pass.setIndexBuffer(this.indexBuffer, 'uint16');
		pass.drawIndexed(indices.length);
	}
}
