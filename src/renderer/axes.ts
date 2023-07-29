import { Camera } from './camera';
import { presentationFormat, sampleCount, createBuffer, Bounds, align } from './util';
import code from '../shaders/axes.wgsl';

function quad(xMin: number, xMax: number, yMin: number, yMax: number) {
	return new Float64Array([
		xMin, yMin, 0,
		xMax, yMin, 0,
		xMax, yMax, 0,
		xMin, yMax, 0,
	]);
}
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
	minPos: GPUBuffer;
	minPosLow: GPUBuffer;
	maxPos: GPUBuffer;
	maxPosLow: GPUBuffer;
	indexBuffer: GPUBuffer;
	bounds: Bounds = {
		x: { min: 0, max: 0 },
		y: { min: 0, max: 0 },
		z: { min: 0, max: 0 },
	};
	uniformBuffer: GPUBuffer;
	bindGroup: GPUBindGroup;
	nInstances = 0;

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
				buffers: [0, 1, 2, 3].map(i => ({
					arrayStride: 4 * 3,
					stepMode: 'instance',
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
			label: 'axes index buffer',
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

		const min = [];
		const max = [];

		let xStep = bounds.x.max - bounds.x.min;
		let nXTiles = 1;
		while (xStep > 1e6) {
			xStep /= 2;
			nXTiles *= 2;
		}
		let yStep = bounds.y.max - bounds.y.min;
		let nYTiles = 1;
		while (yStep > 1e6) {
			yStep /= 2;
			nYTiles *= 2;
		}
		for (let i = 0; i < nXTiles; i++) {
			for (let j = 0; j < nYTiles; j++) {
				min.push(
					bounds.x.min + xStep * i,
					bounds.y.min + yStep * j,
					0
				);
				max.push(
					bounds.x.min + xStep * (i + 1),
					bounds.y.min + yStep * (j + 1),
					0
				);
			}
		}
		console.log(xStep, yStep, min, max)
		this.nInstances = nXTiles * nYTiles;
		console.log('nInstances', this.nInstances)

		const min32 = new Float32Array(min);
		if (this.minPos) this.minPos.destroy();
		this.minPos = createBuffer({
			device: this.device,
			data: min32,
			label: 'ohlcv vertex buffer'
		});

		const min32Low = min.map((v, i) => v - min32[i]);
		if (this.minPosLow) this.minPosLow.destroy();
		this.minPosLow = createBuffer({
			device: this.device,
			data: new Float32Array(min32Low),
			label: 'ohlcv vertex buffer low'
		});

		const max32 = new Float32Array(max);
		if (this.maxPos) this.maxPos.destroy();
		this.maxPos = createBuffer({
			device: this.device,
			data: max32,
			label: 'ohlcv vertex buffer'
		});

		const max32Low = max.map((v, i) => v - max32[i]);
		if (this.maxPosLow) this.maxPosLow.destroy();
		this.maxPosLow = createBuffer({
			device: this.device,
			data: new Float32Array(max32Low),
			label: 'ohlcv vertex buffer low'
		});
	}

	render(pass: GPURenderPassEncoder): void {
		if (!this.minPos || !this.minPosLow) return;
		pass.setPipeline(this.pipeline);
		pass.setBindGroup(0, this.camera.gpu.bindGroup);
		pass.setBindGroup(1, this.bindGroup);
		pass.setVertexBuffer(0, this.minPos);
		pass.setVertexBuffer(1, this.minPosLow);
		pass.setVertexBuffer(2, this.maxPos);
		pass.setVertexBuffer(3, this.maxPosLow);
		pass.setIndexBuffer(this.indexBuffer, 'uint16');
		pass.drawIndexed(indices.length, this.nInstances);
	}
}
