import { Vec3, Vec4, Mat4 } from '@jeditrader/linalg';
import { Material } from './material.js';
import { BufferBinding } from './shader-binding.js';
import { Mesh } from './mesh.js';
import { Aggregate, Period, getNext } from '@jeditrader/providers';
import { Cube } from '@jeditrader/geometry';

const vertCode = `
	let model = mat4_vec4_mul64(model64(arg), position64(arg));
	let model2 = mat4_vec4_mul64(axes, model);
	let eye = vec4_sub64(model2, vec4_64(scene.eye, scene.eyeLow));
	let view = view() * toVec4(eye);
	let proj = scene.proj * view;
	return VertexOutput(proj, color(arg));
`;

export class OHLCV extends Mesh {
	static bindGroup = {
		...Mesh.bindGroup,
		axes: new BufferBinding('axes', {
			visibility: GPUShaderStage.VERTEX,
			wgslType: 'array<f64, 16>'
		}),
	};
	declare buffers: { [s in keyof typeof OHLCV.bindGroup]: GPUBuffer };

	static material(device: GPUDevice) {
		return new Material(device, {
			bindings: Object.values(OHLCV.bindGroup),
			vertCode,
		});
	}

	maxCandles: number;

	// Used by parent
	from?: Date;
	to?: Date;

	constructor(device: GPUDevice, model: GPUBuffer, maxCandles: number) {
		const { positions, indices } = new Cube({ center: new Vec3(0, 0, 1) }).toIndexedTriangles();

		super(device, positions, indices, {
			instances: {
				count: 0,
				models: new Float64Array(maxCandles * 16),
				colors: new Float32Array(maxCandles * 4),
			},
		});
		this.nInstances = 0;
		this.maxCandles = maxCandles;

		this.buffers.axes = model;
	}

	uniformData(model: Mat4) {
		return new Float32Array([
			...model,
			...model.f32Low(),
		]);
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
			0
		);
		const wickTransform = Mat4.translate(wickTranslate).scale(wickScale);

		let color = new Vec4(1, 1, 1, 1);
		if (agg.close > agg.open) color = new Vec4(0, 1, 0, 1);
		else if (agg.close < agg.open) color = new Vec4(1, 0, 0, 1);

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
				colors.push(179 / 255, 153 / 255, 132 / 255, 1.0);
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
		this.updateColors(colors, this.nInstances);
		this.nInstances += nInstances;
	}
}
