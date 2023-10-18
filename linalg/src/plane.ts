import { Vec3 } from '@jeditrader/linalg';
import { Edge } from './edge.js';
import { Line } from './line.js';

export class Plane {
	normal: Vec3;
	point: Vec3;
	w: number;

	constructor(normal: Vec3, point: Vec3) {
		this.normal = normal;
		this.point = point;
		this.w = normal.dot(point);
	}

	static fromPoints(a: Vec3, b: Vec3, c: Vec3): Plane {
		const n = b.sub(a).cross(c.sub(a)).normalize();
		return new Plane(n, a);
	}

	intersectLine(line: Line): Line | Vec3 | undefined {
		// https://en.wikipedia.org/wiki/Line%E2%80%93plane_intersection
		const p0 = this.point;
		const n = this.normal;
		const l0 = line.point;
		const l = line.dir;

		const denom = l.dot(n);
		if (denom === 0) {
			if (p0.sub(l0).dot(n) == 0) return l;
			else return;
		}
		const d = p0.sub(l0).dot(n) / denom;
		return l0.add(l.mulScalar(d));
	}

	distance(p: Vec3): number {
		const v = p.sub(this.point);
		return v.dot(this.normal);
	}

	// TODO: unit tests
	// const testPlane = new Plane(new Vec3(0, 0, 1), new Vec3(0, 1, 0));
	// const testEdge = new Edge(new Vec3(-1, 0, -1), new Vec3(1, 2, 1));
	// const testClip = testPlane.clip(testEdge);
	// console.log(testClip);
	clip(edge: Edge): Edge | undefined {
		const ta = this.distance(edge.a);
		const tb = this.distance(edge.b);
		if (ta >= 0 && tb >= 0) return edge;
		if (ta < 0 && tb < 0) return;

		const dir = edge.dir().normalize();
		const line = new Line(edge.a, dir);
		const p = this.intersectLine(line);

		if (p instanceof Line) return edge; // parallel, should be checked for earlier
		if (!p) return edge; // No intersection

		return new Edge(ta > 0 ? edge.a : edge.b, p);
	}

	clone() {
		return new Plane(this.normal.clone(), this.point.clone());
	}
}

