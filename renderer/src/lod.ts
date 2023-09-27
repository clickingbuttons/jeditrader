import { Period } from '@jeditrader/providers';
const cameraZs: { [p in Period]: number } = {
	'year': Number.MAX_VALUE,
	'month': 1e12,
	'week': 40e9,
	'day': 10e9,
	'hour4': 3e9,
	'hour': 1e9,
	'minute5': 100e6,
	'minute': 20e6,
	'second': 1e6,
	'trade': 2e5,
};
export const lodKeys = Object.keys(cameraZs) as Period[];
export type Lod = Period | 'auto';
export const lods: Lod[] = ['auto', ...lodKeys];

export function getLodIndex(cameraZ: number): number {
	for (var i = lodKeys.length - 1; i >= 0; i--) {
		if (cameraZ < cameraZs[lodKeys[i]]) return i;
	}
	return 0;
}

export function getLod(cameraZ: number): Period {
	return lodKeys[getLodIndex(cameraZ)];
}
