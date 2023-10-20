import { Vec3 } from '@jeditrader/linalg';
import { Cube, Sphere, Vertex } from '@jeditrader/geometry';

describe('csg', () => {

const cube = new Cube();
const sphere = new Sphere({ radius: 1.35 });

it('subtracts sphere from cube', () => {
	const subbed = cube.subtract(sphere);
	expect(subbed.polygons.length).toBe(247);
	const normal = new Vec3(-1, 0, 0);
	expect(subbed.polygons[0].vertices).toEqual(
		[
			new Vertex(new Vec3(-1, 0.791345943969079, 1), { normal }),
			new Vertex(new Vec3(-1, 1, 1), { normal }),
			new Vertex(new Vec3(-1, 1, 0.6877271373405955), { normal }),
		],
	);
});

});
