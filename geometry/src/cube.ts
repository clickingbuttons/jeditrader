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
	radius: 1,
};

export class Cube extends CSG {
	constructor(options: Partial<CubeOptions> = defaultOptions) {
		const { center, radius } = { ...defaultOptions, ...options };
		super([
			[[0, 4, 6, 2], [-1,  0,  0]],
			[[1, 3, 7, 5], [ 1,  0,  0]],
			[[0, 1, 5, 4], [ 0, -1,  0]],
			[[2, 6, 7, 3], [ 0,  1,  0]],
			[[0, 2, 3, 1], [ 0,  0, -1]],
			[[4, 5, 7, 6], [ 0,  0,  1]],
		].map(([positions, normals]) =>
			new Polygon(
				positions.map(i => new Vertex(
					new Vec3(
						center.x + (i & 1 ? radius : -radius),
						center.y + (i & 2 ? radius : -radius),
						center.z + (i & 4 ? radius : -radius),
					),
					new Vec3(normals[0], normals[1], normals[2]),
				))
			)
		));
	}
}
