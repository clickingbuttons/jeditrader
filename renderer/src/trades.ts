import { Vec3 } from '@jeditrader/linalg';
import { Mesh } from './mesh.js';
import { BufferBinding } from './shader-binding.js';
import { Trade } from '@jeditrader/providers';
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

export class Trades extends Mesh {
	/*
	colors: GPUBuffer;
	opacity: GPUBuffer;

	from?: Date;
	to?: Date;

	constructor(device: GPUDevice, chart: GPUBuffer) {
		// TODO: verify maxTrades
		const maxTrades = 1e6;
		const colors = createBuffer({
			device,
			data: new Float32Array(3 * maxTrades),
		});
		const opacity = createBuffer({
			device,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
			data: new Float32Array([1])
		});
		super(
			device,
			new Array(3 * maxTrades).fill(0),
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

	static toBox(trade: Trade, lastPrice: number) {
		const minCellSize = 0.001;
		const bodyMin = new Vec3([
			trade.epochNS / 1e6,
			trade.price,
			Math.log(trade.size)
		]);
		const bodyMax = new Vec3([
			(trade.epochNS / 1e6 + 1e3),
			trade.price + minCellSize,
			Math.log(trade.size) + minCellSize * 1e3,
		]);

		let color = new Vec3([1, 1, 1]);
		if (trade.price > lastPrice) color = new Vec3([0, 1, 0]);
		else if (trade.price < lastPrice) color = new Vec3([1, 0, 0]);

		return {
			body: {
				min: bodyMin,
				max: bodyMax,
			},
			color: color,
		};
	}

	static getGeometry(trades: Trade[]) {
		const positions = [];
		const colors = [];

		var trade;
		var lastPrice = trades[0].price;
		for (let i = 0; i < trades.length; i++) {
			trade = trades[i];

			const { body, color } = Trades.toBox(trade, lastPrice);

			positions.push(...toCube(body));
			colors.push(...color);
			lastPrice = trade.price;
		}

		return {
			positions,
			colors
		};
	}

	updateGeometry(trades: Trade[]) {
		const { positions, colors } = Trades.getGeometry(trades);

		const offset3 = this.nInstances * Float32Array.BYTES_PER_ELEMENT;
		this.updatePositions(positions, offset3 * instanceStride);
		this.device.queue.writeBuffer(this.colors, offset3 * 3, new Float32Array(colors));

		this.nInstances += positions.length / instanceStride;
	}
 */
}
