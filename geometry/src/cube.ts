import { Vec3 } from '@jeditrader/linalg';
import { Vertex } from './vertex.js';
import { Polygon } from './polygon.js';
import { CSG } from './csg.js';

export class Cube extends CSG {
	constructor(center = new Vec3([0, 0, 0]), radius = new Vec3([1, 1, 1])) {
		super([
			[0, 4, 6, 2],
			[1, 3, 7, 5],
			[0, 1, 5, 4],
			[2, 6, 7, 3],
			[0, 2, 3, 1],
			[4, 5, 7, 6]
		].map(positions =>
			new Polygon(
				positions.map(i => new Vertex(
					new Vec3([
						!!(i & 1) ? center.x + radius.x : center.x + -radius.x,
						!!(i & 2) ? center.y + radius.y : center.y + -radius.y,
						!!(i & 4) ? center.z + radius.z : center.z + -radius.z,
					])
				))
			)
		));
	}
}
