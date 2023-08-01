import { vec3 } from 'wgpu-matrix';
import { Camera } from './camera';
import { presentationFormat, sampleCount, createBuffer, depthFormat } from './util';
import { Aggregate, Period, Range, AggBounds } from '../providers/provider';
import { Lods } from './lod';
import code from '../shaders/ohlcv.wgsl';

const indices = new Uint16Array([
	3, 2,
	6, 7,
	4, 2,
	0, 3,
	1, 6,
	5, 4,
	1, 0
]);

function getNext(d: Date, p: Period): Date {
	const res = new Date(d);
	switch (p) {
	case 'year':
		res.setFullYear(d.getFullYear() + 1);
		break;
	case 'month':
		res.setMonth(d.getMonth() + 1);
		break;
	case 'week':
		res.setDate(d.getDate() + 7);
		break;
	case 'day':
		res.setDate(d.getDate() + 1);
		break;
	case 'hour':
		res.setHours(d.getHours() + 1);
		break;
	case 'minute':
		res.setMinutes(d.getMinutes() + 1);
		break;
	default:
		throw new Error('unknown period ' + p);
	}
	return res;
}

const minCellSize = 0.001;
const unitsPerMs = minCellSize;
const unitsPerDollar = minCellSize * 2e9;
const start = new Date(2003);
export type Vec3 = [number, number, number];
export interface Candle {
	body: Range<Vec3>;
	wick: Range<Vec3>;
	color: Vec3;
}

export function toCandle(agg: Aggregate, period: Period): Candle {
	const bodyMin = [0, 0, 0];
	const bodyMax = [0, 0, 0];

	bodyMin[0] = (agg.time.getTime() - start.getTime()) * unitsPerMs;
	bodyMax[0] = (getNext(agg.time, period).getTime() - start.getTime()) * unitsPerMs;

	bodyMin[1] = Math.min(agg.close, agg.open) * unitsPerDollar;
	bodyMax[1] = Math.max(agg.close, agg.open) * unitsPerDollar;

	bodyMin[2] = 0;
	bodyMax[2] = agg.volume / 1e3;

	const wickMin = [...bodyMin];
	const wickMax = [...bodyMax];

	const center = [
		(bodyMax[0] - bodyMin[0]) / 2,
		(bodyMax[1] - bodyMin[1]) / 2,
		(bodyMax[2] - bodyMin[2]) / 2,
	];

	wickMin[0] = bodyMin[0] + (bodyMax[0] - bodyMin[0]) / 4;
	wickMax[0] = bodyMax[0] - (bodyMax[0] - bodyMin[0]) / 4;
	wickMin[1] = agg.low * unitsPerDollar;
	wickMax[1] = agg.high * unitsPerDollar;
	wickMin[2] = bodyMin[2] + (bodyMax[2] - bodyMin[2]) / 2.5;
	wickMax[2] = bodyMax[2] - (bodyMax[2] - bodyMin[2]) / 2.5;

	let color = [1, 1, 1];
	if (agg.close > agg.open) color = [0, 1, 0];
	else if (agg.close < agg.open) color = [1, 0, 0];

	return {
		body: {
			min: bodyMin as [number, number, number],
			max: bodyMax as [number, number, number],
		},
		wick: {
			min: wickMin as [number, number, number],
			max: wickMax as [number, number, number],
		},
		color: color as [number, number, number],
	};
}

export function toBounds(agg: AggBounds, period: Period): Range<Vec3> {
	const min = [0, 0, 0];
	const max = [0, 0, 0];

	min[0] = (agg.time.min.getTime() - start.getTime()) * unitsPerMs;
	max[0] = (getNext(agg.time.max, period).getTime() - start.getTime()) * unitsPerMs;

	min[1] = agg.low.min * unitsPerDollar;
	max[1] = agg.high.max * unitsPerDollar;

	min[2] = 0;
	max[2] = Math.sqrt(agg.volume.max);

	return {
		min: min as [number, number, number],
		max: max as [number, number, number],
	};
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
	lods: Lods;

	constructor(device: GPUDevice, camera: Camera, lods: Lods) {
		this.device = device;
		this.camera = camera;
		this.lods = lods;
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

	getGeometry(aggs: Aggregate[], period: Period) {
		const mins = new Float32Array(aggs.length * 2 * 3);
		const minsLow = new Float32Array(aggs.length * 2 * 3);
		const maxs = new Float32Array(aggs.length * 2 * 3);
		const maxsLow = new Float32Array(aggs.length * 2 * 3);
		const colors = new Float32Array(aggs.length * 2 * 3);

		var agg;
		for (let i = 0; i < aggs.length; i++) {
			agg = aggs[i];

			const { body, wick, color } = toCandle(agg, period);
			let index = i * 6;

			mins.set(body.min, index);
			minsLow.set(vec3.sub(body.min, mins.slice(index, index + 3)), index);
			maxs.set(body.max, index);
			maxsLow.set(vec3.sub(body.max, maxs.slice(index, index + 3)), index);
			colors.set(color, index);

			index += 3;

			mins.set(wick.min, index);
			minsLow.set(vec3.sub(wick.min, mins.slice(index, index + 3)), index);
			maxs.set(wick.max, index);
			maxsLow.set(vec3.sub(wick.max, maxs.slice(index, index + 3)), index);
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

	updateGeometry() {
		const lod = this.lods.lods[this.lods.lod];
		if (!lod || !lod.aggs || lod.aggs.length === 0 || !lod.aggBounds) return;

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

	update(newLod: boolean) {
		if (!newLod) return;

		this.updateGeometry();
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

