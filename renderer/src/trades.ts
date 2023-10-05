import { Vec3, Vec4, Mat4 } from '@jeditrader/linalg';
import { Mesh } from './mesh.js';
import { Trade } from '@jeditrader/providers';
import { Cube } from '@jeditrader/geometry';
import { BufferBinding } from './shader-binding.js';

export class Trades extends Mesh {
	static bindGroup = {
		...Mesh.bindGroup,
		axes: new BufferBinding('axes', {
			visibility: GPUShaderStage.VERTEX,
			wgslType: 'array<f64, 16>'
		}),
	};
	declare buffers: { [s in keyof typeof Trades.bindGroup]: GPUBuffer };

	maxTrades: number;

	// Used by parent
	from?: Date;
	to?: Date;

	constructor(device: GPUDevice, model: GPUBuffer, maxTrades: number) {
		const { positions, indices } = new Cube({ center: new Vec3(0, 0, 1) }).toIndexedTriangles();

		super(device, positions, indices, {
			instances: {
				count: 0,
				models: new Float64Array(maxTrades * 16),
				colors: new Float32Array(maxTrades * 4),
			},
		});
		this.nInstances = 0;
		this.maxTrades = maxTrades;

		this.buffers.axes = model;
	}

	static toBox(trade: Trade, lastPrice: number) {
		const scale = new Vec3(1, 0.01, trade.size);
		const translate = new Vec3(
			trade.epochNS / 1e6,
			trade.price,
			0
		);
		const model = Mat4.translate(translate).scale(scale);

		let color = new Vec4(1, 1, 1, 1);
		if (trade.price > lastPrice) color = new Vec4(0, 1, 0, 1);
		else if (trade.price < lastPrice) color = new Vec4(1, 0, 0, 1);

		return { model, color };
	}

	static getGeometry(trades: Trade[]) {
		const models = [];
		const colors = [];

		var trade;
		var lastPrice = trades[0].price;
		for (let i = 0; i < trades.length; i++) {
			trade = trades[i];
			const { model, color } = Trades.toBox(trade, lastPrice);

			models.push(...model);
			colors.push(...color);
			lastPrice = trade.price;
		}

		return {
			models,
			colors
		};
	}

	updateGeometry(trades: Trade[]) {
		const { models, colors } = Trades.getGeometry(trades);
		const nInstances = models.length / 16;

		if (this.nInstances + nInstances > this.maxTrades) {
			// TODO: nice cache eviction
			console.warn('throwing out trades');
			this.nInstances = 0;
		}

		this.updateModels(models, this.nInstances);
		this.updateColors(colors, this.nInstances);
		this.nInstances += nInstances;
	}
}
