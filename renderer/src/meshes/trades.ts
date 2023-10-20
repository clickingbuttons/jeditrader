import { Vec3, Vec4, Mat4 } from '@jeditrader/linalg';
import { Mesh } from './mesh.js';
import { Trade } from '@jeditrader/providers';
import { Cube } from '@jeditrader/geometry';
import { MeshResources } from '../materials/index.js';
import { Color } from '@jeditrader/geometry';

export class Trades extends Mesh {
	declare resources: MeshResources;

	maxTrades: number;

	// Used by parent
	from?: Date;
	to?: Date;

	constructor(device: GPUDevice, model: GPUBufferBinding, maxTrades: number) {
		const { positions, indices, normals } = new Cube({
			center: new Vec3(0, 0, 1)
		}).toIndexedTriangles();

		super(device, positions, indices, {
			normals,
			instances: {
				count: 0,
				models: new Float64Array(maxTrades * 16),
				colors: new Uint8Array(maxTrades * 4),
			},
		});
		this.nInstances = 0;
		this.maxTrades = maxTrades;

		this.resources.inModel = model;
	}

	static toBox(trade: Trade, lastPrice: number) {
		const scale = new Vec3(1, 0.01, trade.size);
		const translate = new Vec3(
			trade.epochNS / 1e6,
			trade.price,
			0
		);
		const model = Mat4.translate(translate).scale(scale);

		let color = Color.white;
		if (trade.price > lastPrice) color = Color.green;
		else if (trade.price < lastPrice) color = Color.red;

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
		this.updateInstanceColors(colors, this.nInstances);
		this.nInstances += nInstances;
	}
}
