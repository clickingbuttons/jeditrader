import { Camera } from './camera';
import { presentationFormat, sampleCount, createBuffer, align, depthFormat } from './util';
import { toBounds, toCandle, Vec3 } from './ohlcv';
import { Range } from '../providers/provider';
import { Lods } from './lod';
import code from '../shaders/axes.wgsl';

const indices = new Uint16Array([
	0, 1,
	2, 2,
	3, 0
]);

export class Axes {
	device: GPUDevice;
	camera: Camera;
	pipeline: GPURenderPipeline;
	minPos?: GPUBuffer;
	minPosLow?: GPUBuffer;
	maxPos?: GPUBuffer;
	maxPosLow?: GPUBuffer;
	indices: GPUBuffer;
	uniforms: GPUBuffer;
	horizontalLines: GPUBuffer;
	verticalLines: GPUBuffer;
	bindGroupLayout: GPUBindGroupLayout;
	bindGroup: GPUBindGroup;
	nInstances = 0;
	lods: Lods;

	constructor(device: GPUDevice, camera: Camera, lods: Lods) {
		this.device = device;
		this.camera = camera;
		this.lods = lods;
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
			depthStencil: {
				depthWriteEnabled: false,
				depthCompare: 'less',
				format: depthFormat,
			},
			primitive: {
				topology: 'triangle-strip',
				stripIndexFormat: 'uint16',
				cullMode: 'none',
			},
			multisample: { count: sampleCount },
		});

		this.indices = createBuffer({
			device,
			usage: GPUBufferUsage.INDEX,
			data: indices,
			arrayTag: 'u16',
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

	getVerticalLines(): number[] {
		const verticalLines = [];

		const minDate = new Date(this.aggBounds.x.min);
		const maxDate = new Date(this.aggBounds.x.max);

		switch (this.getLod()) {
			case LOD.year: {
				const startOfYear = new Date(minDate.getFullYear() + 1, 0);
				for (let d = startOfYear; d <= maxDate; d.setFullYear(d.getFullYear() + 1)) {
					verticalLines.push(toWorldX(d.getTime(), this.aggBounds));
				}
				break;
			}
			case LOD.month: {
				const startOfMonth = new Date(minDate.getFullYear(), minDate.getMonth() + 1);
				for (let d = startOfMonth; d <= maxDate; d.setMonth(d.getMonth() + 1)) {
					verticalLines.push(toWorldX(d.getTime(), this.aggBounds));
				}
				break;
			}
		}

		return verticalLines;
	}

	getBounds(lodLevel: number): Range<Vec3>[] {
		var res: Range<Vec3>[] = [];

		const lod = this.lods.lods[Math.max(lodLevel, 0)];
		if (!lod?.aggBounds) return res;

		if (lodLevel === -1) {
			return [toBounds(lod.aggBounds, lod.name)];
		}

		if (!lod?.aggs) return res;
		for (var i = 0; i < lod.aggs.length; i++) {
			const agg = lod.aggs[i];
			const candle = toCandle(agg, lod.name);
			res.push({
				min: [candle.body.min[0], candle.wick.min[1], 0],
				max: [candle.body.max[0], candle.wick.max[1], 0],
			});
		}

		return res;
	}

	getGeometry() {
		const mins = [];
		const maxs = [];

		const bounds = this.getBounds(this.lods.lod - 1);
		for (let i = 0; i < bounds.length; i++) {
			const bound = bounds[i];
			mins.push(bound.min[0], bound.min[1], bound.min[2]);
			maxs.push(bound.max[0], bound.max[1], bound.max[2]);
		}

		return { mins, maxs };
	}

	updateGeometry() {
		const { mins, maxs } = this.getGeometry();
		this.nInstances = mins.length / 3;

		const min32 = new Float32Array(mins);
		if (this.minPos) this.minPos.destroy();
		this.minPos = createBuffer({
			device: this.device,
			data: min32,
		});
		const min32Low = mins.map((v, i) => v - min32[i]);
		if (this.minPosLow) this.minPosLow.destroy();
		this.minPosLow = createBuffer({
			device: this.device,
			data: new Float32Array(min32Low),
		});

		const max32 = new Float32Array(maxs);
		if (this.maxPos) this.maxPos.destroy();
		this.maxPos = createBuffer({
			device: this.device,
			data: max32,
		});
		const max32Low = maxs.map((v, i) => v - max32[i]);
		if (this.maxPosLow) this.maxPosLow.destroy();
		this.maxPosLow = createBuffer({
			device: this.device,
			data: new Float32Array(max32Low),
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
			data: new Float32Array(this.getVerticalLines()),
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

	update(newLod: boolean) {
		if (!newLod) return;

		this.updateGeometry();
		// this.updateLines();
	}

	render(pass: GPURenderPassEncoder): void {
		if (!this.minPos || !this.minPosLow || !this.maxPos || !this.maxPosLow || this.nInstances === 0) return;
		pass.setPipeline(this.pipeline);
		pass.setBindGroup(0, this.camera.gpu.bindGroup);
		pass.setBindGroup(1, this.bindGroup);
		pass.setVertexBuffer(0, this.minPos);
		pass.setVertexBuffer(1, this.minPosLow);
		pass.setVertexBuffer(2, this.maxPos);
		pass.setVertexBuffer(3, this.maxPosLow);
		pass.setIndexBuffer(this.indices, 'uint16');
		pass.drawIndexed(indices.length, this.nInstances);
	}
}
