import { Period } from '@jeditrader/providers';
import { OHLCV } from './ohlcv.js';
import { Trades } from './trades.js';

export type Range<T> = {
	min: T;
	max: T;
}

export interface Lod {
	cameraZ: number;
	data?: OHLCV | Trades;
}

export const lods = {
	'year': {
		cameraZ: Number.MAX_VALUE,
	},
	'month': {
		cameraZ: 1e12,
	},
	'week': {
		cameraZ: 40e9,
	},
	'day': {
		cameraZ: 10e9,
	},
	'hour4': {
		cameraZ: 4e9,
	},
	'hour': {
		cameraZ: 2e9,
	},
	'minute5': {
		cameraZ: 250e6,
	},
	'minute': {
		cameraZ: 50e6,
	},
	'trade': {
		cameraZ: 10e6,
	}
} as { [p in Period]: Lod };
export const lodKeys = [
	'year',
	'month',
	'week',
	'day',
	'hour4',
	'hour',
	'minute5',
	'minute',
	'trade',
] as Period[];
