import { Vec3 } from '@jeditrader/linalg';
import { Camera } from './camera.js';
import { presentationFormat, sampleCount, createBuffer, depthFormat } from './util.js';
import { Aggregate, Period, Range } from '@jeditrader/providers';
import { Lod, unitsPerMs, unitsPerDollar, getNext } from './chart.js';
import { ohlcv as code } from './shaders/index.js';

const indices = new Uint16Array([
	3, 2,
	6, 7,
	4, 2,
	0, 3,
	1, 6,
	5, 4,
	1, 0
]);

export interface Candle {
	body: Range<Vec3>;
	wick: Range<Vec3>;
	color: Vec3;
}

export class OHLCV {
	device: GPUDevice;
	camera: Camera;
	pipeline: GPURenderPipeline;
	indices: GPUBuffer;
	minPos?: GPUBuffer;
	minPosLow?: GPUBuffer;
	maxPos?: GPUBuffer;
	maxPosLow?: GPUBuffer;
	color?: GPUBuffer;
	nInstances = 0;

	constructor(device: GPUDevice, camera: Camera) {
		this.device = device;
		this.camera = camera;
		this.pipeline = device.createRenderPipeline({
			layout: camera.gpu.layout,
			vertex: {
				module: device.createShaderModule({ code }),
				entryPoint: 'vert',
				buffers: [0, 1, 2, 3, 4].map(i => ({
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
				depthWriteEnabled: true,
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
	}

	toCandle(agg: Aggregate, period: Period): Candle {
		const bodyMin = new Vec3(
			agg.time.getTime() * unitsPerMs,
			Math.min(agg.close, agg.open) * unitsPerDollar,
			0
		);
		const bodyMax = new Vec3(
			getNext(agg.time, period).getTime() * unitsPerMs,
			Math.max(agg.close, agg.open) * unitsPerDollar,
			agg.volume / 1e3,
		);

		const wickMin = new Vec3(
			bodyMin.x + (bodyMax.x - bodyMin.x) / 4,
			agg.low * unitsPerDollar,
			bodyMin.z + (bodyMax.z - bodyMin.z) / 2.5,
		);
		const wickMax = new Vec3(
			bodyMax.x - (bodyMax.x - bodyMin.x) / 4,
			agg.high * unitsPerDollar,
			bodyMax.z - (bodyMax.z - bodyMin.z) / 2.5,
		);

		let color = new Vec3(1, 1, 1);
		if (agg.close > agg.open) color = new Vec3(0, 1, 0);
		else if (agg.close < agg.open) color = new Vec3(1, 0, 0);

		return {
			body: {
				min: bodyMin,
				max: bodyMax,
			},
			wick: {
				min: wickMin,
				max: wickMax,
			},
			color: color,
		};
	}

	getGeometry(aggs: Aggregate[], period: Period) {
		const mins = new Float32Array(aggs.length * 2 * 3);
		const minsLow = new Float32Array(aggs.length * 2 * 3);
		const maxs = new Float32Array(aggs.length * 2 * 3);
		const maxsLow = new Float32Array(aggs.length * 2 * 3);
		const colors = new Float32Array(aggs.length * 2 * 3);

		var agg;
		for (let i = 0; i < aggs.length; i++) {
			agg = aggs[i];

			const { body, wick, color } = this.toCandle(agg, period);
			let index = i * 6;

			mins.set(body.min.elements(), index);
			minsLow.set(body.min.elementsLow(), index);
			maxs.set(body.max.elements(), index);
			maxsLow.set(body.max.elementsLow(), index);
			colors.set(color.elements(), index);

			index += 3;

			mins.set(wick.min.elements(), index);
			minsLow.set(wick.min.elementsLow(), index);
			maxs.set(wick.max.elements(), index);
			maxsLow.set(wick.max.elementsLow(), index);
			colors.set([179 / 255, 153 / 255, 132 / 255], index);
		}

		return {
			mins,
			minsLow,
			maxs,
			maxsLow,
			colors
		};
	}

	updateGeometry(lod: Lod) {
		if (!lod.aggs) return;

		const { mins, minsLow, maxs, maxsLow, colors } = this.getGeometry(lod.aggs, lod.name);
		if (this.minPos) this.minPos.destroy();
		this.minPos = createBuffer({
			device: this.device,
			data: mins,
		});
		if (this.minPosLow) this.minPosLow.destroy();
		this.minPosLow = createBuffer({
			device: this.device,
			data: minsLow,
		});

		if (this.maxPos) this.maxPos.destroy();
		this.maxPos = createBuffer({
			device: this.device,
			data: maxs,
		});
		if (this.maxPosLow) this.maxPosLow.destroy();
		this.maxPosLow = createBuffer({
			device: this.device,
			data: maxsLow,
		});

		if (this.color) this.color.destroy();
		this.color = createBuffer({
			device: this.device,
			data: colors,
		});
		this.nInstances = mins.length / 3;
	}

	setLod(newLod: Lod) {
		this.updateGeometry(newLod);
	}

	render(pass: GPURenderPassEncoder): void {
		if (
			!this.minPos ||
			!this.minPosLow ||
			!this.maxPos ||
			!this.maxPosLow ||
			!this.color ||
			this.nInstances === 0
		) return;
		pass.setPipeline(this.pipeline);
		pass.setBindGroup(0, this.camera.gpu.bindGroup);
		pass.setVertexBuffer(0, this.minPos);
		pass.setVertexBuffer(1, this.minPosLow);
		pass.setVertexBuffer(2, this.maxPos);
		pass.setVertexBuffer(3, this.maxPosLow);
		pass.setVertexBuffer(4, this.color);
		pass.setIndexBuffer(this.indices, 'uint16');
		pass.drawIndexed(indices.length, this.nInstances);
	}
}

