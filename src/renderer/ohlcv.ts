import { Camera } from './camera';
import { presentationFormat, sampleCount } from './util';
import vertCode from '../shaders/instanced.vert.wgsl';
import fragCode from '../shaders/vertexPositionColor.frag.wgsl';

const vertices = new Float32Array([
	+1, +1, -1,
	-1, +1, -1,
	+1, -1, -1,
	-1, -1, -1,
	+1, +1, +1,
	-1, +1, +1,
	-1, -1, +1,
	+1, -1, +1,
]);
const indices = new Uint16Array([
	3, 2,
	6, 7,
	4, 2,
	0, 3,
	1, 6,
	5, 4,
	1, 0
]);

export class OHLCV {
	camera: Camera;
	pipeline: GPURenderPipeline;
	vertexBuffer: GPUBuffer;
	indexBuffer: GPUBuffer;

	constructor(device: GPUDevice, camera: Camera) {
		this.camera = camera;
		this.pipeline = device.createRenderPipeline({
			layout: camera.gpu.layout,
			vertex: {
				module: device.createShaderModule({ code: vertCode }),
				entryPoint: 'main',
				buffers: [
					{
						arrayStride: vertices.byteLength / 8,
						attributes: [
							{
								format: 'float32x3',
								offset: 0,
								shaderLocation: 0
							},
						]
					},
				],
			},
			fragment: {
				module: device.createShaderModule({ code: fragCode }),
				entryPoint: 'main',
				targets: [
					{
						format: presentationFormat,
					},
				],
			},
			depthStencil: {
				depthWriteEnabled: true,
				depthCompare: 'less',
				format: 'depth24plus',
			},
			primitive: {
				topology: 'triangle-strip',
				stripIndexFormat: 'uint16',
				cullMode: 'none',
			},
			multisample: {
				count: sampleCount
			},
		});

		this.vertexBuffer = device.createBuffer({
			label: 'ohlcv vertex buffer',
			size: vertices.byteLength,
			usage: GPUBufferUsage.VERTEX,
			mappedAtCreation: true
		});
		new Float32Array(this.vertexBuffer.getMappedRange()).set(vertices);
		this.vertexBuffer.unmap()

		this.indexBuffer = device.createBuffer({
			label: 'ohlcv index buffer',
			size: indices.byteLength,
			usage: GPUBufferUsage.INDEX,
			mappedAtCreation: true
		});
		new Uint16Array(this.indexBuffer.getMappedRange()).set(indices);
		this.indexBuffer.unmap()
	}

	render(pass: GPURenderPassEncoder): void {
		pass.setPipeline(this.pipeline);
		pass.setBindGroup(0, this.camera.gpu.bindGroup);
		pass.setVertexBuffer(0, this.vertexBuffer);
		pass.setIndexBuffer(this.indexBuffer, 'uint16');
		pass.drawIndexed(indices.length);
		pass.end();
	}
}

