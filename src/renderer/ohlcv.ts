import { vec3 } from 'wgpu-matrix';
import { Camera } from './camera';
import { presentationFormat, sampleCount, createBuffer, Bounds } from './util';
import { Aggregate } from '../helpers';
import { minCellSize } from './axes';
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
const unitsPerMs = minCellSize / 1e3;
const unitsPerDollar = minCellSize * 100e3;

export class OHLCV {
	device: GPUDevice;
	camera: Camera;
	pipeline: GPURenderPipeline;
	indexBuffer: GPUBuffer;
	instanceMinPos?: GPUBuffer;
	instanceMinPosLow?: GPUBuffer;
	instanceMaxPos?: GPUBuffer;
	instanceMaxPosLow?: GPUBuffer;
	instanceColor?: GPUBuffer;
	nInstances = 0;

	constructor(device: GPUDevice, camera: Camera) {
		this.device = device;
		this.camera = camera;
		this.pipeline = device.createRenderPipeline({
			label: 'ohlcv pipeline',
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
			// depthStencil: {
			// 	depthWriteEnabled: true,
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
	}

	setAggs(aggs: Aggregate[], bounds: Bounds, aggMs: number): Bounds {
		const res: Bounds = {
			x: { min: Number.MAX_VALUE, max: Number.MIN_VALUE },
			y: { min: Number.MAX_VALUE, max: Number.MIN_VALUE },
			z: { min: Number.MAX_VALUE, max: Number.MIN_VALUE },
		};
		if (aggs.length > 0) {
			const instanceMinPos = new Float32Array(aggs.length * 3 + 3);
			const instanceMinPosLow = new Float32Array(aggs.length * 3 + 3);
			const instanceMaxPos = new Float32Array(aggs.length * 3 + 3);
			const instanceMaxPosLow = new Float32Array(aggs.length * 3 + 3);
			const instanceColor = new Float32Array(aggs.length * 3 + 3);

			const midX = (bounds.x.max - bounds.x.min) / 2;
			const midY = (bounds.y.max - bounds.y.min) / 2;
			var agg;
			for (let i = 0; i < aggs.length; i++) {
				agg = aggs[i];
				const minX = (agg.time - bounds.x.min - midX) * unitsPerMs;
				const maxX = minX + unitsPerMs * aggMs;
				const minY = (Math.min(agg.close, agg.open) - midY) * unitsPerDollar;
				const maxY = (Math.max(agg.close, agg.open) - midY) * unitsPerDollar;
				const minZ = 0;
				const maxZ = Math.log(agg.volume);
				let color = [1, 1, 1];
				if (agg.close > agg.open) color = [0, 1, 0];
				else if (agg.close < agg.open) color = [1, 0, 0];

				if (minX < res.x.min) res.x.min = minX;
				if (maxX > res.x.max) res.x.max = maxX;
				if (minY < res.y.min) res.y.min = minY;
				if (maxY > res.y.max) res.y.max = maxY;
				if (minZ < res.z.min) res.z.min = minZ;
				if (maxZ > res.z.max) res.z.max = maxZ;

				const min = [minX, minY, minZ];
				const max = [maxX, maxY, maxZ];
				if (min.some(isNaN)) console.log('bad agg', agg);
				if (max.some(isNaN)) console.log('bad agg', agg);

				instanceMinPos.set(min, i * 3);
				instanceMinPosLow.set(vec3.sub(min, instanceMinPos.slice(i * 3, i * 3 + 3)), i * 3);
				instanceMaxPos.set(max, i * 3);
				instanceMaxPosLow.set(vec3.sub(max, instanceMaxPos.slice(i * 3, i * 3 + 3)), i * 3);
				instanceColor.set(color, i * 3);
			}

			if (this.instanceMinPos) this.instanceMinPos.destroy();
			instanceMinPos.set([0, 0, 0], aggs.length * 3);
			this.instanceMinPos = createBuffer({
				device: this.device,
				data: instanceMinPos,
				label: 'ohlcv instance buffer minPos',
			});
			if (this.instanceMinPosLow) this.instanceMinPosLow.destroy();
			instanceMinPosLow.set([0, 0, 0], aggs.length * 3);
			this.instanceMinPosLow = createBuffer({
				device: this.device,
				data: instanceMinPosLow,
				label: 'ohlcv instance buffer minPosLow',
			});

			if (this.instanceMaxPos) this.instanceMaxPos.destroy();
			instanceMaxPos.set([1, 1, 1], aggs.length * 3);
			this.instanceMaxPos = createBuffer({
				device: this.device,
				data: instanceMaxPos,
				label: 'ohlcv instance buffer maxPos',
			});
			if (this.instanceMaxPosLow) this.instanceMaxPosLow.destroy();
			instanceMaxPosLow.set([0, 0, 0], aggs.length * 3);
			this.instanceMaxPosLow = createBuffer({
				device: this.device,
				data: instanceMaxPosLow,
				label: 'ohlcv instance buffer maxPosLow',
			});

			if (this.instanceColor) this.instanceColor.destroy();
			instanceColor.set([0, 0, 1], aggs.length * 3);
			this.instanceColor = createBuffer({
				device: this.device,
				data: instanceColor,
				label: 'ohlcv instance buffer color',
			});
		}

		this.nInstances = aggs.length + 1;
		return res;
	}

	render(pass: GPURenderPassEncoder): void {
		if (
			!this.instanceMinPos ||
			!this.instanceMinPosLow ||
			!this.instanceMaxPos ||
			!this.instanceMaxPosLow ||
			!this.instanceColor
		) return;
		pass.setPipeline(this.pipeline);
		pass.setBindGroup(0, this.camera.gpu.bindGroup);
		pass.setVertexBuffer(0, this.instanceMinPos);
		pass.setVertexBuffer(1, this.instanceMinPosLow);
		pass.setVertexBuffer(2, this.instanceMaxPos);
		pass.setVertexBuffer(3, this.instanceMaxPosLow);
		pass.setVertexBuffer(4, this.instanceColor);
		pass.setIndexBuffer(this.indexBuffer, 'uint16');
		pass.drawIndexed(indices.length, this.nInstances);
	}
}

