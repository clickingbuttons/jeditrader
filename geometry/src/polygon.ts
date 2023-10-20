import { Plane } from './plane.js';
import { Vertex } from './vertex.js';
import { Color } from './color.js';
import { Edge } from './edge.js';

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

	edges(): Edge[] {
		const res: Edge[] = [];

		const len = this.vertices.length;
		for (let i = 0; i < len; i++) {
			const v1 = this.vertices[i];
			v1.color = v1.color ?? this.color;
			const v2 = this.vertices[(i + 1) % len];
			v2.color = v2.color ?? this.color;
			res.push(new Edge(v1, v2));
		}

		return res;
	}
}

