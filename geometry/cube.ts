import { Polygon } from './polygon.js';
import { Node } from './node.js';
import { Vec3 } from './util.js';

export class Cube extends Node {
	constructor(center: Vec3 = [0, 0, 0], radius: Vec3 = [1, 1, 1]) {
		super([
			{ positions: [0, 4, 6, 2] },
			{ positions: [1, 3, 7, 5] },
			{ positions: [0, 1, 5, 4] },
			{ positions: [2, 6, 7, 3] },
			{ positions: [0, 2, 3, 1] },
			{ positions: [4, 5, 7, 6] }
		].map(({ positions }) =>
			new Polygon(
				positions.map(i => [
					!!(i & 1) ? center[0] + radius[0] : center[0] + radius[0] * -1,
					!!(i & 2) ? center[1] + radius[1] : center[1] + radius[1] * -1,
					!!(i & 4) ? center[2] + radius[2] : center[2] + radius[2] * -1
				])
			)
		));
	}
}
