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
		const peak = new Vertex(
			opts.center.add(new Vec3(0, 0, opts.height)),
			new Vec3(0, 0, 1)
		);
		const mountain = circle.polygons[0];
		mountain.vertices.forEach(v => v.normal = peak.sub(v).mulScalar(-1).normalize());
		mountain.vertices[0] = mountain.vertices[mountain.vertices.length - 1] = peak;

		const base = new Circle(opts);
		const basePoly = base.polygons[0].flip();
		basePoly.vertices.forEach(v => v.normal = peak.sub(v).mulScalar(-1).normalize());

		super([
			mountain,
			basePoly,
		]);
	}
}
