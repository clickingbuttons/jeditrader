import { Aggregate, AggRange, Period } from '@jeditrader/providers';

export interface Lod {
	name: Period;
	cameraZ: number;
	aggs?: Aggregate[];
	range?: AggRange;
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
		name: 'hour',
		cameraZ: 2e6,
	},
	{
		name: 'minute',
		cameraZ: 250e3,
	},
];
