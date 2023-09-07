import { Vec3 } from '@jeditrader/linalg';
import { Vertex } from './vertex.js';
import { Polygon } from './polygon.js';
import { CSG } from './csg.js';

// In case you want normals
export function sphereDirection(theta: number, phi: number): Vec3 {
	theta *= Math.PI * 2;
	phi *= Math.PI;
	return new Vec3([
		Math.cos(theta) * Math.sin(phi),
		Math.cos(phi),
		Math.sin(theta) * Math.sin(phi)
	]);
}

export function sphereVertex(
	center: Vec3,
	radius: number,
	theta: number,
	phi: number,
): Vertex {
	const dir = sphereDirection(theta, phi);
	return new Vertex(center.add(dir.mulScalar(radius)), dir);
}

export class Sphere extends CSG {
	constructor(
		center = new Vec3([0, 0, 0]),
		radius = 1,
		slices = 16,
		stacks = 8
	) {
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
