import { Vec3 } from '@jeditrader/linalg';
import { Camera } from './camera.js';
import { Mesh, ShaderBinding } from './mesh.js';
import { Aggregate, Period, Range } from '@jeditrader/providers';
import { Lod, unitsPerMs, unitsPerDollar, getNext } from './chart.js';
import { createBuffer } from './util.js';

const indices = [
	//    5---6
	//   /   /
	//  4---7
	//    1---2
	//   /   /
	//  0---3
	// bottom face
	0, 1, 2,
	2, 3, 0,

	// top face
	4, 5, 6,
	6, 7, 4,

	// left face
	0, 1, 4,
	4, 5, 1,

	// right face
	2, 3, 7,
	7, 6, 2,

	// front face
	0, 3, 4,
	4, 7, 3,

	// back face
	1, 2, 5,
	5, 6, 2,
];

export interface Candle {
	body: Range<Vec3>;
	wick?: Range<Vec3>;
	color: Vec3;
}

const vertStride = 24;
function toCube(range: Range<Vec3>): number[] {
	return [
		range.min.x, range.min.y, range.min.z,
		range.min.x, range.max.y, range.min.z,
		range.max.x, range.max.y, range.min.z,
		range.max.x, range.min.y, range.min.z,

		range.min.x, range.min.y, range.max.z,
		range.min.x, range.max.y, range.max.z,
		range.max.x, range.max.y, range.max.z,
		range.max.x, range.min.y, range.max.z,
	];
}

export class OHLCV extends Mesh {
	positions: GPUBuffer;
	colors: GPUBuffer;
	opacity: GPUBuffer;

	constructor(device: GPUDevice, camera: Camera) {
		const maxCandles = 1e6;
		const positions = createBuffer({
			device,
			data: new Float32Array(3 * maxCandles),
		});
		const colors = createBuffer({
			device,
			data: new Float32Array(3 * maxCandles),
		});
		const opacity = createBuffer({
			device,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
			data: new Float32Array([0.2])
		});
		super(
			device,
			camera,
			ShaderBinding.positions(positions, 3, vertStride),
			ShaderBinding.indices(device, indices),
			ShaderBinding.colors(colors, 0, 3),
			[
				new ShaderBinding({
					name: 'opacity',
					type: 'uniform',
					buffer: opacity,
					visibility: GPUShaderStage.FRAGMENT,
					wgslType: 'f32'
				}),
			],
			true,
			`return vec4f(in.color.xyz, opacity);`
		);
		this.positions = positions;
		this.colors = colors;
		this.opacity = opacity;
		this.nInstances = 0;
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
			wick: wickMin.y < bodyMin.y || wickMax.y > bodyMax.y ? {
				min: wickMin,
				max: wickMax,
			} : undefined,
			color: color,
		};
	}

	getGeometry(aggs: Aggregate[], period: Period) {
		const positions = [];
		const colors = [];

		var agg;
		for (let i = 0; i < aggs.length; i++) {
			agg = aggs[i];

			const { body, wick, color } = this.toCandle(agg, period);

			if (wick) {
				positions.push(...toCube(wick));
				colors.push(179 / 255, 153 / 255, 132 / 255);
			}
			positions.push(...toCube(body));
			colors.push(...color.elements());
		}

		return {
			positions,
			colors
		};
	}

	updateGeometry(lod: Lod) {
		if (!lod.aggs) return;

		const { positions, colors } = this.getGeometry(lod.aggs, lod.name);

		this.device.queue.writeBuffer(this.positions, 0, new Float32Array(positions));
		this.device.queue.writeBuffer(this.colors, 0, new Float32Array(colors));

		this.nInstances = positions.length / vertStride;
	}
}
