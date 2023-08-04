import { Polygon } from './polygon.js';
import { Node } from './node.js';
import { vec3, Vec3 } from './util.js';

// In case you want normals
export function sphereDirection(theta: number, phi: number): Vec3 {
	theta *= Math.PI * 2;
	phi *= Math.PI;
	return [
		Math.cos(theta) * Math.sin(phi),
		Math.cos(phi),
		Math.sin(theta) * Math.sin(phi)
	];
}

export function sphereVertex(
	center: Vec3,
	radius: number,
	theta: number,
	phi: number,
): Vec3 {
	const dir = sphereDirection(theta, phi);
	return vec3.add(center, vec3.mulScalar(dir, radius));
}

export class Sphere extends Node {
	constructor(
		center: Vec3 = [0, 0, 0],
		radius: number = 1,
		slices: number = 16,
		stacks: number = 8
	) {
		const polygons: Polygon[] = [];
		for (var i = 0; i < slices; i++) {
			for (var j = 0; j < stacks; j++) {
				const vertices: Vec3[] = [];
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
