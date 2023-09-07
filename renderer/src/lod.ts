import { Period } from '@jeditrader/providers';
import { OHLCV } from './ohlcv.js';
import { Trades } from './trades.js';

export function getNext(d: Date, p: Period | 'trade'): Date {
	const res = new Date(d);
	switch (p) {
	case 'year':
		res.setUTCFullYear(d.getUTCFullYear() + 1);
		break;
	case 'month':
		res.setUTCMonth(d.getUTCMonth() + 1);
		break;
	case 'week':
		res.setUTCDate(d.getUTCDate() + 7);
		break;
	case 'day':
		res.setUTCDate(d.getUTCDate() + 1);
		break;
	case 'hour4':
		res.setUTCHours(d.getUTCHours() + 4);
		break;
	case 'hour':
		res.setUTCHours(d.getUTCHours() + 1);
		break;
	case 'minute5':
		res.setUTCMinutes(d.getUTCMinutes() + 5);
		break;
	case 'minute':
		res.setUTCMinutes(d.getUTCMinutes() + 1);
		break;
	case 'trade':
		res.setUTCMilliseconds(d.getTime() + 1);
		break;
	default:
		throw new Error('unknown period ' + p);
	}
	return res;
}

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
