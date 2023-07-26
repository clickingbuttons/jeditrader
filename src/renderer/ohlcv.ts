import { Camera } from './camera';
import { presentationFormat, sampleCount } from './util';
import vertCode from '../shaders/ohlcv.vert.wgsl';
import fragCode from '../shaders/ohlcv.frag.wgsl';

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
const instances = new Float32Array([
	0, 0, 0, 0,
	1, 1, 1, 1,
	2, 2, 2, -1,
]);
const instanceStep = 4;

export class OHLCV {
	camera: Camera;
	pipeline: GPURenderPipeline;
	vertexBuffer: GPUBuffer;
	indexBuffer: GPUBuffer;
	instanceBuffer: GPUBuffer;

	constructor(device: GPUDevice, camera: Camera) {
		this.camera = camera;
		this.pipeline = device.createRenderPipeline({
			layout: camera.gpu.layout,
			vertex: {
				module: device.createShaderModule({ code: vertCode }),
				entryPoint: 'main',
				buffers: [
					{
						arrayStride: 3 * 4,
						attributes: [
							{
								format: 'float32x3',
								offset: 0,
								shaderLocation: 0
							},
						]
					},
					{
						arrayStride: instanceStep * 4,
						stepMode: 'instance',
						attributes: [
							{
								format: 'float32x4',
								offset: 0,
								shaderLocation: 1
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

		this.instanceBuffer = device.createBuffer({
			label: 'ohlcv instance buffer',
			size: instances.byteLength,
			usage: GPUBufferUsage.VERTEX,
			mappedAtCreation: true
		});
		new Float32Array(this.instanceBuffer.getMappedRange()).set(instances);
		this.instanceBuffer.unmap()
	}

	render(pass: GPURenderPassEncoder): void {
		pass.setPipeline(this.pipeline);
		pass.setBindGroup(0, this.camera.gpu.bindGroup);
		pass.setVertexBuffer(0, this.vertexBuffer);
		pass.setVertexBuffer(1, this.instanceBuffer);
		pass.setIndexBuffer(this.indexBuffer, 'uint16');
		pass.drawIndexed(indices.length, instances.length / instanceStep);
		pass.end();
	}
}

