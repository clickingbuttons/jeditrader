import { Vec3 } from '@jeditrader/linalg';
import { sortCounterClockwise } from '@jeditrader/renderer';

describe('sort vertices', () => {
	it('works', () => {
		const vertices = [
			new Vec3(1, 1, 0),
			new Vec3(-1, -1, 0),
			new Vec3(-1, 1, 0),
			new Vec3(1, -1, 0),
		];
		sortCounterClockwise(vertices);
		expect(vertices).toEqual([
			new Vec3(1, -1, 0),
			new Vec3(1, 1, 0),
			new Vec3(-1, 1, 0),
			new Vec3(-1, -1, 0),
		]);
	});
});
