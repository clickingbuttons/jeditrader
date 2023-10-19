import { Plane } from './plane.js';
import { Vertex } from './vertex.js';

// Represents a convex polygon. The vertices used to initialize a polygon must
// be coplanar and form a convex loop.
export class Polygon {
	vertices: Vertex[];
	plane: Plane;

	constructor(vertices: Vertex[]) {
		if (vertices.length < 3)
			throw new Error(`a polygon must have at least 3 vertices, got ${vertices.length}`);
		this.vertices = vertices;
		this.plane = Plane.fromPoints(vertices[0], vertices[1], vertices[2]);
	}

	clone(): Polygon {
		return new Polygon(this.vertices.map(v => v.clone()));
	}

	flip(): Polygon {
		return new Polygon(this.vertices.reverse());
	}
}

