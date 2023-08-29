import { Vertex } from './vertex.js';
import { Polygon } from './polygon.js';
import { Vec3 } from '@jeditrader/linalg';

export enum PolygonType {
	coplanar = 0,
	front = 1,
	back = 2,
	spanning = 3,
};

export class Plane {
	// Tolerance used by `splitPolygon()` to decide if a point is on the plane
	static EPSILON = 1e-5;

	normal: Vec3;
	w: number;

	constructor(normal: Vec3, w: number) {
		this.normal = normal;
		this.w = w;
	}

	static fromPoints(a: Vec3, b: Vec3, c: Vec3): Plane {
		var n = b.sub(a).cross(c.sub(a)).normalize();
		return new Plane(n, n.dot(a));
	}

	clone() {
		return new Plane(this.normal.clone(), this.w);
	}

	flip() {
		this.normal = this.normal.mulScalar(-1);
		this.w = -this.w;
	}

	// Split `polygon` by this plane if needed, then put the polygon or polygon
	// fragments in the appropriate lists. Coplanar polygons go into either
	// `coplanarFront` or `coplanarBack` depending on their orientation with
	// respect to this plane. Polygons in front or in back of this plane go into
	// either `front` or `back`.
	splitPolygon(
		polygon: Polygon,
		coplanarFront: Polygon[],
		coplanarBack: Polygon[],
		front: Polygon[],
		back: Polygon[]
	) {
		var polygonType = 0;
		var types: number[] = [];
		for (var i = 0; i < polygon.vertices.length; i++) {
			var t = this.normal.dot(polygon.vertices[i].pos) - this.w;
			var type = (t < -Plane.EPSILON) ? PolygonType.back : (t > Plane.EPSILON) ? PolygonType.front : PolygonType.coplanar;
			polygonType |= type;
			types.push(type);
		}

		// Put the polygon in the correct list, splitting it when necessary.
		switch (polygonType) {
			case PolygonType.coplanar:
				(this.normal.dot(polygon.plane.normal) > 0 ? coplanarFront : coplanarBack).push(polygon);
			break;
			case PolygonType.front:
				front.push(polygon);
			break;
			case PolygonType.back:
				back.push(polygon);
			break;
			case PolygonType.spanning:
				var f: Vertex[] = [], b: Vertex[] = [];
			for (var i = 0; i < polygon.vertices.length; i++) {
				var j = (i + 1) % polygon.vertices.length;
				var ti = types[i], tj = types[j];
				var vi = polygon.vertices[i], vj = polygon.vertices[j];
				if (ti != PolygonType.back) f.push(vi);
				if (ti != PolygonType.front) b.push(ti != PolygonType.back ? vi.clone() : vi);
				if ((ti | tj) == PolygonType.spanning) {
					var t = (this.w - this.normal.dot(vi.pos)) / this.normal.dot(vj.pos.sub(vi.pos));
					var v = vi.interpolate(vj, t);
					f.push(v);
					b.push(v.clone());
				}
			}
			if (f.length >= 3) front.push(new Polygon(f, polygon.userdata));
			if (b.length >= 3) back.push(new Polygon(b, polygon.userdata));
			break;
		}
	}
}

