import { mat4, vec3 } from 'wgpu-matrix';
import { Camera } from './camera';
import { presentationFormat, sampleCount, createBuffer } from './util';
import { Aggregate } from '../helpers';
import vertCode from '../shaders/ohlcv.vert.wgsl';
import fragCode from '../shaders/ohlcv.frag.wgsl';

const vertices = new Float32Array([
	+0.5, +0.5, -0.5,
	-0.5, +0.5, -0.5,
	+0.5, -0.5, -0.5,
	-0.5, -0.5, -0.5,
	+0.5, +0.5, +0.5,
	-0.5, +0.5, +0.5,
	-0.5, -0.5, +0.5,
	+0.5, -0.5, +0.5,
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
	device: GPUDevice;
	camera: Camera;
	pipeline: GPURenderPipeline;
	vertexBuffer: GPUBuffer;
	indexBuffer: GPUBuffer;
	instanceBufferPos?: GPUBuffer;
	instanceBufferScale?: GPUBuffer;
	nInstances = 0;

	constructor(device: GPUDevice, camera: Camera) {
		this.device = device;
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
							{ format: 'float32x3', offset: 0, shaderLocation: 0 },
						]
					},
					{
						arrayStride: 3 * 4,
						stepMode: 'instance',
						attributes: [
							{ format: 'float32x3', offset: 0, shaderLocation: 1 },
						]
					},
					{
						arrayStride: 3 * 4,
						stepMode: 'instance',
						attributes: [
							{ format: 'float32x3', offset: 0, shaderLocation: 2 },
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

		this.vertexBuffer = createBuffer({
			device,
			data: vertices,
			label: 'ohlcv vertex buffer'
		});
		this.indexBuffer = createBuffer({
			device,
			usage: GPUBufferUsage.INDEX,
			data: indices,
			arrayTag: 'u16',
			label: 'ohlcv index buffer',
		});
	}

	setAggs(aggs: Aggregate[]) {
		if (aggs.length === 0) {
			this.nInstances = 0;
			return;
		}
		const instancePos = new Float32Array(aggs.length * 3);
		const instanceScale = new Float32Array(aggs.length * 3);
		const firstTs = aggs[0].time;
		for (let i = 0; i < aggs.length; i++) {
			const agg = aggs[i];
			const x = (agg.time - firstTs) / 86400000;
			const y = (agg.close - agg.open) / 2;
			const z = 0.5;
			instancePos.set([x, y, z], i * 3);
			instanceScale.set([1, (agg.close - agg.open), 1], i * 3);
		}

		if (this.instanceBufferPos) this.instanceBufferPos.destroy();
		this.instanceBufferPos = createBuffer({
			device: this.device,
			data: instancePos,
			label: 'ohlcv instance buffer positions',
		});

		if (this.instanceBufferScale) this.instanceBufferScale.destroy();
		this.instanceBufferScale = createBuffer({
			device: this.device,
			data: instanceScale,
			label: 'ohlcv instance buffer scales',
		});

		this.nInstances = aggs.length;
	}

	render(pass: GPURenderPassEncoder): void {
		if (!this.instanceBufferPos || !this.instanceBufferScale) return;
		pass.setPipeline(this.pipeline);
		pass.setBindGroup(0, this.camera.gpu.bindGroup);
		pass.setVertexBuffer(0, this.vertexBuffer);
		pass.setVertexBuffer(1, this.instanceBufferPos);
		pass.setVertexBuffer(2, this.instanceBufferScale);
		pass.setIndexBuffer(this.indexBuffer, 'uint16');
		pass.drawIndexed(indices.length, this.nInstances);
	}
}

