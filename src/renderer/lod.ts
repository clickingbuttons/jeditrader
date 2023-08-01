import { Aggregate, AggBounds, Period } from '../providers/provider';

export interface Lod {
	name: Period;
	aggMs: number;
	cameraZ: number;
	aggs?: Aggregate[];
	aggBounds?: AggBounds;
}

export class Lods {
	lods: Lod[] = [
		{
			name: 'year',
			aggMs: 86400e3 * 365,
			cameraZ: 1e9,
		},
		{
			name: 'month',
			aggMs: 86400e3 * 30,
			cameraZ: 1e9,
		},
		{
			name: 'week',
			aggMs: 86400e3 * 7,
			cameraZ: 20e6,
		},
		{
			name: 'day',
			aggMs: 86400e3,
			cameraZ: 5e6,
		},
		{
			name: 'hour',
			aggMs: 360e3,
			cameraZ: 2e6,
		},
		{
			name: 'minute',
			aggMs: 60e3,
			cameraZ: 250e3,
		},
	];
	lod = -1;

	update(cameraZ: number): boolean {
		const lastLod = this.lod;
		for (var i = 0; i < this.lods.length; i++) {
			if (this.lods[i].cameraZ < cameraZ) {
				const newLod = Math.max(i - 1, 0);
				if (newLod !== lastLod) {
					this.lod = newLod;
					console.log('lod', newLod, this.lods[newLod].name, cameraZ);
					return true;
				} else {
					return false;
				}
			}
		}

		return false;
	}
};
