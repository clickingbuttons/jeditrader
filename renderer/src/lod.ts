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

export const minCellSize = 0.001;

export const lods = {
	'year': {
		cameraZ: Number.MAX_VALUE,
	},
	'month': {
		cameraZ: 1e9,
	},
	'week': {
		cameraZ: 40e6,
	},
	'day': {
		cameraZ: 10e6,
	},
	'hour4': {
		cameraZ: 4e6,
	},
	'hour': {
		cameraZ: 2e6,
	},
	'minute5': {
		cameraZ: 250e3,
	},
	'minute': {
		cameraZ: 50e3,
	},
	'trade': {
		cameraZ: 10e3,
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
