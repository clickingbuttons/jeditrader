import { Camera } from './camera.js';
import { Mesh, ShaderBinding } from './mesh.js';
import { Trade } from '@jeditrader/providers';
import { unitsPerMs, unitsPerDollar } from './chart.js';
import { createBuffer } from './util.js';

const instanceStride = 3;

export class Trades extends Mesh {
	colors: GPUBuffer;
	opacity: GPUBuffer;

	constructor(device: GPUDevice, camera: Camera) {
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
			camera,
			new Array(3 * maxTrades).fill(0),
			[0],
			{
				instanceStride,
				bindings: [
					new ShaderBinding({
						name: 'colors',
						visibility: GPUShaderStage.FRAGMENT,
						buffer: colors
					}),
					new ShaderBinding({
						name: 'opacity',
						type: 'uniform',
						buffer: opacity,
						visibility: GPUShaderStage.FRAGMENT,
						wgslType: 'f32'
					}),
				],
				depthWriteEnabled: false,
				vertOutputFields: ['@interpolate(flat) instance: u32'],
				vertCode: 'return VertexOutput(camera.mvp * posChart(arg), arg.instance);',
				fragCode: `return vec4f(
					colors[arg.instance * 3 + 0],
					colors[arg.instance * 3 + 1],
					colors[arg.instance * 3 + 2],
					opacity
				);`,
				topology: 'point-list',
			}
		);
		this.colors = colors;
		this.opacity = opacity;
		this.nInstances = 0;
	}

	static getGeometry(trades: Trade[]) {
		const positions = [];
		const colors = [];

		var trade;
		var lastPrice = trades[0].price;
		for (let i = 0; i < trades.length; i++) {
			trade = trades[i];

			positions.push(
				trade.epochNS / 1e6 * unitsPerMs,
				trade.price * unitsPerDollar,
				Math.log(trade.size),
			);

			if (trade.price > lastPrice) colors.push(0, 1, 0);
			else if (trade.price < lastPrice) colors.push(1, 0, 0);
			else colors.push(1, 1, 1);

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

	destroy() {
		super.destroy();
		this.colors.destroy();
		this.opacity.destroy();
	}

	render(pass: GPURenderPassEncoder): void {
		if (this.nInstances <= 0) return;

		pass.setPipeline(this.pipeline);
		this.bindGroups.forEach((b, i) => pass.setBindGroup(i, b));
		pass.draw(1, this.nInstances);
	}
}
