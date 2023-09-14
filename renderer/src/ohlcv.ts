import { Vec3 } from '@jeditrader/linalg';
import { Mesh, BufferBinding } from './mesh.js';
import { Aggregate, Period, getNext } from '@jeditrader/providers';
import { createBuffer } from './util.js';
import { Range } from './util.js';

const indices = [
	//    5---6
	//   /   /
	//  4---7
	//    1---2
	//   /   /
	//  0---3
	// bottom face
	0, 3, 2,
	2, 1, 0,

	// top face
	4, 7, 6,
	6, 5, 4,

	// left face
	0, 4, 5,
	5, 1, 0,

	// right face
	2, 6, 7,
	7, 3, 2,

	// front face
	0, 3, 7,
	7, 4, 0,

	// back face
	1, 5, 2,
	2, 5, 6,
];

export interface Candle {
	body: Range<Vec3>;
	wick?: Range<Vec3>;
	color: Vec3;
}

const instanceStride = 24;
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
	colors: GPUBuffer;
	opacity: GPUBuffer;

	// start: Date;
	// end: Date;

	constructor(device: GPUDevice, chart: GPUBuffer) {
		// TODO: verify maxCandles
		const maxCandles = 1e6;
		const colors = createBuffer({
			device,
			data: new Float32Array(3 * maxCandles),
		});
		const opacity = createBuffer({
			device,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
			data: new Float32Array([1])
		});
		super(
			device,
			chart,
			new Array(3 * maxCandles).fill(0),
			indices,
			{
				instanceStride,
				bindings: [
					new BufferBinding(
						'colors',
						colors,
						{ visibility: GPUShaderStage.FRAGMENT }
					),
					new BufferBinding(
						'opacity',
						opacity,
						{
							type: 'uniform',
							visibility: GPUShaderStage.FRAGMENT,
							wgslType: 'f32'
						}
					),
				],
				depthWriteEnabled: false,
				vertOutputFields: ['@interpolate(flat) instance: u32'],
				vertCode: 'return VertexOutput(chart.proj * chart.view * pos(arg), arg.instance);',
				fragCode: `return vec4f(
	colors[arg.instance * 3 + 0],
	colors[arg.instance * 3 + 1],
	colors[arg.instance * 3 + 2],
	opacity
);`,
			}
		);
		this.colors = colors;
		this.opacity = opacity;
		this.nInstances = 0;
	}

	static toCandle(agg: Aggregate, period: Period): Candle {
		const bodyMin = new Vec3([
			agg.time.getTime(),
			Math.min(agg.close, agg.open),
			0
		]);
		const bodyMax = new Vec3([
			getNext(agg.time, period).getTime(),
			Math.max(agg.close, agg.open),
			agg.volume / 1e3,
		]);

		const wickMin = new Vec3([
			bodyMin.x + (bodyMax.x - bodyMin.x) / 4,
			agg.low,
			bodyMin.z + (bodyMax.z - bodyMin.z) / 2.5,
		]);
		const wickMax = new Vec3([
			bodyMax.x - (bodyMax.x - bodyMin.x) / 4,
			agg.high,
			bodyMax.z - (bodyMax.z - bodyMin.z) / 2.5,
		]);

		let color = new Vec3([1, 1, 1]);
		if (agg.close > agg.open) color = new Vec3([0, 1, 0]);
		else if (agg.close < agg.open) color = new Vec3([1, 0, 0]);

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

	static getGeometry(aggs: Aggregate[], period: Period) {
		const positions = [];
		const colors = [];

		var agg;
		for (let i = 0; i < aggs.length; i++) {
			agg = aggs[i];

			const { body, wick, color } = OHLCV.toCandle(agg, period);

			if (wick) {
				positions.push(...toCube(wick));
				colors.push(179 / 255, 153 / 255, 132 / 255);
			}
			positions.push(...toCube(body));
			colors.push(...color);
		}

		return {
			positions,
			colors
		};
	}

	updateGeometry(aggs: Aggregate[], period: Period) {
		const { positions, colors } = OHLCV.getGeometry(aggs, period);

		// if (aggs[0].time < this.start) this.start = new Date(aggs[0].time);
		// if (aggs[aggs.length - 1].time > this.end) this.end = new Date(aggs[aggs.length - 1].time);

		const offset3 = this.nInstances * Float32Array.BYTES_PER_ELEMENT;
		this.updatePositions(positions, offset3 * instanceStride);
		this.device.queue.writeBuffer(this.colors, offset3 * 3, new Float32Array(colors));

		this.nInstances += positions.length / instanceStride;
	}
}
