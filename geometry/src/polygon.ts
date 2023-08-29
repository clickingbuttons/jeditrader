import { Plane } from './plane.js';
import { Vertex } from './vertex.js';

// Represents a convex polygon. The vertices used to initialize a polygon must
// be coplanar and form a convex loop.
//
// Each convex polygon has a `userdata` property, which is shared between all
// polygons that are clones of each other or were split from the same polygon.
// This can be used to define per-polygon properties (such as surface color).
export class Polygon {
	vertices: Vertex[];
	plane: Plane;
	userdata?: any;

	constructor(vertices: Vertex[], userdata?: any) {
		this.vertices = vertices;
		this.plane = Plane.fromPoints(vertices[0].pos, vertices[1].pos, vertices[2].pos);
		this.userdata = userdata;
	}

	clone(): Polygon {
		return new Polygon(this.vertices.map(v => v.clone()), this.userdata);
	}

	flip(): void {
		this.vertices.reverse().map(v => v.flip());
		this.plane.flip();
	}
}

