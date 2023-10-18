import { Vec3, Vec4, Mat4 } from '@jeditrader/linalg';
import { MeshResources } from '../materials/index.js';
import { Mesh } from './mesh.js';
import { Aggregate, Period, getNext } from '@jeditrader/providers';
import { Cube } from '@jeditrader/geometry';
import { Color } from '../color.js';

export class OHLCV extends Mesh {
	declare resources: MeshResources;

	maxCandles: number;

	// Used by parent
	from?: Date;
	to?: Date;

	constructor(device: GPUDevice, model: GPUBufferBinding, maxCandles: number) {
		const { positions, indices, normals } = new Cube({
			radius: 1,
			center: new Vec3(0, 0, 1),
		}).toIndexedTriangles();

		super(device, positions, indices, {
			normals,
			instances: {
				count: 0,
				models: new Float64Array(maxCandles * 16),
				colors: new Uint8Array(maxCandles * 4),
			},
		});
		this.nInstances = 0;
		this.maxCandles = maxCandles;

		this.resources.inModel = model;
	}

	static toCandle(agg: Aggregate, period: Period) {
		const width = getNext(agg.time, period).getTime() - agg.time.getTime();
		const scale = new Vec3(
			width / 2,
			Math.abs(agg.close - agg.open) / 2,
			agg.volume
		);
		const translate = new Vec3(
			agg.time.getTime() + width / 2,
			(agg.close + agg.open) / 2,
			0
		);
		const model = Mat4.translate(translate).scale(scale);

		const wickScale = new Vec3(
			scale.x / 8,
			(agg.high - agg.low) / 2,
			scale.z / 8,
		);
		const wickTranslate = new Vec3(
			translate.x,
			(agg.high + agg.low) / 2,
			scale.z
		);
		const wickTransform = Mat4.translate(wickTranslate).scale(wickScale);

		let color = Color.white;
		if (agg.close > agg.open) color = Color.green;
		else if (agg.close < agg.open) color = Color.red;

		return {
			body: model,
			color: color,
			wick: wickTransform,
		};
	}

	static getGeometry(aggs: Aggregate[], period: Period) {
		const models: number[] = [];
		const colors: number[] = [];

		var agg;
		for (let i = 0; i < aggs.length; i++) {
			agg = aggs[i];
			const { body, wick, color } = OHLCV.toCandle(agg, period);

			if (wick) {
				models.push(...wick);
				colors.push(...new Color(179, 153, 132));
			}
			models.push(...body);
			colors.push(...color);
		}

		return {
			models,
			colors
		};
	}

	appendGeometry(aggs: Aggregate[], period: Period) {
		const { models, colors } = OHLCV.getGeometry(aggs, period);
		const nInstances = models.length / 16;

		if (this.nInstances + nInstances > this.maxCandles) {
			// TODO: nice cache eviction
			console.warn('throwing out candles');
			this.nInstances = 0;
		}

		this.updateModels(models, this.nInstances);
		this.updateInstanceColors(colors, this.nInstances);
		this.nInstances += nInstances;
	}
}
