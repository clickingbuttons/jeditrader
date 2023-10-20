import { Vec3 } from '@jeditrader/linalg';
import { Vertex } from './vertex.js';
import { Polygon } from './polygon.js';
import { CSG } from './csg.js';

export interface CircleOptions {
	center: Vec3;
	radius: number;
	slices: number;
}
export const defaultOptions: CircleOptions = {
	center: new Vec3(0),
	radius: .5,
	slices: 16,
};

function circleDirection(theta: number): Vec3 {
	theta *= Math.PI * 2;
	return new Vec3(
		Math.cos(theta),
		Math.sin(theta),
		0,
	);
}

export class Circle extends CSG {
	constructor(options: Partial<CircleOptions> = defaultOptions) {
		const { center, radius, slices } = { ...defaultOptions, ...options };

		const vertices: Vertex[] = [...Array(slices + 1).keys()]
			.map(i => {
				const normal = circleDirection(i / slices);
				const p = center.add(normal.mulScalar(radius));
				return new Vertex(p, { normal });
			});
		const centerV = new Vertex(center, { normal: new Vec3(0, 0, 1) });

		super([
			new Polygon([centerV, ...vertices, centerV])
		]);
	}
}
