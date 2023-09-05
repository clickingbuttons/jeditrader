import { Period } from '@jeditrader/providers';
import { OHLCV } from './ohlcv.js';

export type Range<T> = {
	min: T;
	max: T;
}

export interface Lod {
	name: Period;
	cameraZ: number;
	ohlcv?: OHLCV;
}

export const minCellSize = 0.001;

export const lods: Lod[] = [
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
		name: 'hour4',
		cameraZ: 4e6,
	},
	{
		name: 'hour',
		cameraZ: 2e6,
	},
	{
		name: 'minute5',
		cameraZ: 250e3,
	},
	{
		name: 'minute',
		cameraZ: 50e3,
	},
];
