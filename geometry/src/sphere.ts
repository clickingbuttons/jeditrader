import { Vec3 } from '@jeditrader/linalg';
import { Vertex } from './vertex.js';
import { Polygon } from './polygon.js';
import { CSG } from './csg.js';

// In case you want normals
function sphereDirection(theta: number, phi: number): Vec3 {
	theta *= Math.PI * 2;
	phi *= Math.PI;
	return new Vec3(
		Math.cos(theta) * Math.sin(phi),
		Math.cos(phi),
		Math.sin(theta) * Math.sin(phi)
	);
}

function sphereVertex(
	center: Vec3,
	radius: number,
	theta: number,
	phi: number,
): Vertex {
	const normal = sphereDirection(theta, phi);
	const res = new Vertex(center.add(normal.mulScalar(radius)), { normal });
	return res;
}

export interface SphereOptions {
	center: Vec3;
	radius: number;
	slices: number;
	stacks: number;
};

const defaultOptions = {
	center: new Vec3(0),
	radius: 1,
	slices: 16,
	stacks: 8
};

export class Sphere extends CSG {
	constructor(options: Partial<SphereOptions> = defaultOptions) {
		const { center, radius, slices, stacks } = { ...defaultOptions, ...options };
		const polygons: Polygon[] = [];
		for (var i = 0; i < slices; i++) {
			for (var j = 0; j < stacks; j++) {
				const vertices: Vertex[] = [];
				vertices.push(sphereVertex(center, radius, i / slices, j / stacks));
				if (j > 0) {
					vertices.push(sphereVertex(center, radius, (i + 1) / slices, j / stacks));
				}
				if (j < stacks - 1) {
					vertices.push(sphereVertex(center, radius, (i + 1) / slices, (j + 1) / stacks));
				}
				vertices.push(sphereVertex(center, radius, i / slices, (j + 1) / stacks));
				polygons.push(new Polygon(vertices));
			}
		}
		super(polygons);
	}
}
