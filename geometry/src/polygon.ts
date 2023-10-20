import { Plane } from './plane.js';
import { Vertex } from './vertex.js';
import { Color } from './color.js';

// Represents a convex polygon. The >= 3 vertices used to initialize a polygon must be coplanar and
// form a convex counter-clockwise loop.
//
// Color will be applied to vertices unless they have their own color.
export class Polygon {
	vertices: Vertex[];
	plane: Plane;
	color?: Color;

	constructor(vertices: Vertex[], color?: Color) {
		if (vertices.length < 3)
			throw new Error(`a polygon must have at least 3 vertices, got ${vertices.length}`);
		this.vertices = vertices;
		this.plane = Plane.fromPoints(vertices[0], vertices[1], vertices[2]);
		this.color = color;
	}

	clone(): Polygon {
		return new Polygon(this.vertices.map(v => v.clone()), this.color);
	}

	flip(): Polygon {
		return new Polygon(this.vertices.reverse(), this.color);
	}
}

