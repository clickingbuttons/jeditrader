import { Vec3 } from '@jeditrader/linalg';
import { Vertex } from './vertex.js';
import { Polygon } from './polygon.js';
import { CSG } from './csg.js';
import { Circle, CircleOptions, defaultOptions as circleDefaults } from './circle.js';

export interface ConeOptions extends CircleOptions {
	height: number;
}
const defaultOptions: ConeOptions = {
	...circleDefaults,
	height: circleDefaults.radius,
};

export class Cone extends CSG {
	constructor(options: Partial<ConeOptions> = defaultOptions) {
		const opts: ConeOptions = { ...defaultOptions, ...options };
		const circle = new Circle(opts);
		const finalVert = opts.center.add(new Vec3(0, 0, -opts.height));

		const circlePoly = circle.polygons[0];
		const verts = [...circlePoly.vertices];
		verts[0] = new Vertex(finalVert);

		let vertices = circlePoly.vertices;
		vertices.reverse();
		vertices.unshift(vertices.pop() as Vertex);

		super([
			circlePoly,
			new Polygon(verts)
		]);
	}
}
