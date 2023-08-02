import { vec3 } from 'wgpu-matrix';
import { Camera } from './camera';
import { Axes } from './axes';
import { OHLCV } from './ohlcv';
import { Input } from './input';
import { Aggregate, AggRange, Period, Range, Provider } from '../providers/provider';
import { toymd } from '../helpers';

export type Vec3 = vec3.default;
export interface Lod {
	name: Period;
	cameraZ: number;
	aggs?: Aggregate[];
	range?: AggRange;
}

const minCellSize = 0.001;
export const unitsPerMs = minCellSize;
export const unitsPerDollar = minCellSize * 2e9;

export function getNext(d: Date, p: Period): Date {
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

function toBounds(agg: AggRange, period: Period): Range<Vec3> {
	const min = [0, 0, 0];
	const max = [0, 0, 0];

	min[0] = agg.time.min.getTime() * unitsPerMs;
	max[0] = getNext(agg.time.max, period).getTime() * unitsPerMs;

	min[1] = agg.low.min * unitsPerDollar;
	max[1] = agg.high.max * unitsPerDollar;

	min[2] = 0;
	max[2] = Math.sqrt(agg.volume.max);

	return { min, max };
}

const defaultPeriods: Period[] = ['year', 'month', 'week', 'day'];

export class Chart {
	ticker: string;
	input: Input;
	camera: Camera;
	ohlcv: OHLCV;
	axes: Axes;
	provider: Provider;
	forceRender = false;

	lods: Lod[] = [
		{
			name: 'year',
			cameraZ: Number.MAX_VALUE,
		},
		{
			name: 'month',
			cameraZ: 1e9,
		},
		{
			name: 'week',
			cameraZ: 40e6,
		},
		{
			name: 'day',
			cameraZ: 10e6,
		},
		{
			name: 'hour',
			cameraZ: 2e6,
		},
		{
			name: 'minute',
			cameraZ: 250e3,
		},
	];
	lod = -1;

	constructor(
		canvas: HTMLCanvasElement,
		device: GPUDevice,
		provider: Provider,
		ticker: string,
	) {
		this.input = new Input(canvas);
		this.camera = new Camera(canvas, device);
		this.ohlcv = new OHLCV(device, this.camera);
		this.axes = new Axes(device, this.camera);
		this.provider = provider;
		this.setTicker(ticker);
		this.ticker = ticker;
	}

	onData(aggs: Aggregate[], period: Period, range: AggRange) {
		const lodIndex = this.lods.findIndex(l => l.name === period);
		const lod = this.lods[lodIndex];
		if (!lod) throw new Error('unknown lod ' + period);

		lod.aggs = aggs;
		lod.range = range;
		this.forceRender = true;
	}

	setTicker(ticker: string) {
		if (this.ticker === ticker) return;

		this.ticker = ticker;
		this.lods.forEach(lod => {
			lod.aggs = undefined;
			lod.range = undefined;
		});

		const from = '1970-01-01';
		const to = toymd(new Date());
		const largestPeriod = 'year';
		this.provider[largestPeriod](this.ticker, from, to).then(({ aggs, range }) => {
			this.axes.setRange(toBounds(range, largestPeriod));
			this.onData(aggs, largestPeriod, range);
		});
	}

	updateLod(cameraZ: number): boolean {
		const from = '1970-01-01';
		const to = toymd(new Date());

		const lastLod = this.lod;
		for (var i = 0; i < this.lods.length; i++) {
			if (this.lods[i].cameraZ < cameraZ) {
				const newLod = Math.max(i - 1, 0);
				if (newLod !== lastLod) {
					this.lod = newLod;
					const period = this.lods[newLod].name;
					console.log('lod', newLod, period, cameraZ);
					if (!this.lods[newLod].aggs) {
						this.provider[period](this.ticker, from, to).then(({ aggs, range }) => {
							if (period === 'year') this.axes.setRange(toBounds(range, period));
							this.onData(aggs, period, range);
							this.ohlcv.setLod(this.lods[newLod]);
						});
					} else {
						this.ohlcv.setLod(this.lods[newLod]);
					}

					return true;
				} else {
					return false;
				}
			}
		}

		return false;
	}

	update(dt: DOMHighResTimeStamp): boolean {
		this.camera.update(dt, this.input);
		const lodChanged = this.updateLod(this.camera.eye[2]);
		this.input.update();

		const res = this.input.focused || lodChanged || this.forceRender;
		this.forceRender = false;
		return res;
	}

	render(pass: GPURenderPassEncoder) {
		this.axes.render(pass);
		this.ohlcv.render(pass);
	}
};
