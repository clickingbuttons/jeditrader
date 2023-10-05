import { Vec3 } from '@jeditrader/linalg';
import { Vertex } from './vertex.js';
import { Polygon } from './polygon.js';
import { CSG } from './csg.js';

export interface CubeOptions {
	center: Vec3;
	radius: number;
}
const defaultOptions: CubeOptions = {
	center: new Vec3(0),
	radius: .5,
};

export class Cube extends CSG {
	constructor(options: Partial<CubeOptions> = defaultOptions) {
		const { center, radius } = { ...defaultOptions, ...options };
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
					new Vec3(
						!!(i & 1) ? center.x + radius : center.x + -radius,
						!!(i & 2) ? center.y + radius : center.y + -radius,
						!!(i & 4) ? center.z + radius : center.z + -radius,
					)
				))
			)
		));
	}
}
