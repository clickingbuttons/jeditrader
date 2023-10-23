import { Vec3 } from '@jeditrader/linalg';
import { Line } from './line.js';
import { Edge } from './edge.js';

export class Plane {
	// https://mathworld.wolfram.com/HessianNormalForm.html
	normal: Vec3;
	d: number;

	/// normal.dot(p) = d
	constructor(normal: Vec3, d: number) {
		this.normal = normal;
		this.d = d;
	}

	static fromPoint(normal: Vec3, p: Vec3): Plane {
		return new Plane(normal, normal.dot(p));
	}

	static fromPoints(a: Vec3, b: Vec3, c: Vec3): Plane {
		const n = b.sub(a).cross(c.sub(a)).normalize();
		return new Plane(n, n.dot(a));
	}

	/// ax + by + cz + d = 0
	static fromEquation(a: number, b: number, c: number, d: number): Plane {
		const dir = new Vec3(a, b, c);
		const mag = dir.magnitude();
		return new Plane(dir.divScalar(mag), -d / mag);
	}

	point(): Vec3 {
		let nonZero = this.normal.findIndex(v => v !== 0);
		if (nonZero === 0) return new Vec3(this.d / this.normal.x, 0, 0);
		if (nonZero === 1) return new Vec3(0, this.d / this.normal.y, 0);
		if (nonZero === 2) return new Vec3(0, 0, this.d / this.normal.z);
		return new Vec3(0);
	}

	distance(point: Vec3): number {
		return point.dot(this.normal) - this.d;
	}

	private interectLineT(line: Line): number | undefined {
		// https://en.wikipedia.org/wiki/Line%E2%80%93plane_intersection
		const p0 = this.point();
		const n = this.normal;
		const l0 = line.point;
		const l = line.dir;

		const denom = l.dot(n);
		if (denom === 0) {
			if (p0.sub(l0).dot(n) == 0) return NaN;
			else return;
		}
		return p0.sub(l0).dot(n) / denom;
	}

	intersectLine(line: Line): Line | Vec3 | undefined {
		const t = this.interectLineT(line);
		if (Number.isNaN(t)) return line;
		if (typeof(t) === 'number') return line.point.add(line.dir.mulScalar(t));

		return t;
	}

	intersectEdge(edge: Edge): Edge | Vec3 | undefined {
		const t = this.interectLineT(Line.fromPoints(edge.a, edge.b));
		if (Number.isNaN(t)) return edge;
		if (typeof(t) === 'number' && t >= 0 && t <= 1) return edge.a.add(edge.dir().mulScalar(t));

		return;
	}

	intersectPlane(plane: Plane): Plane | Line | undefined {
		// https://en.wikipedia.org/wiki/Plane%E2%80%93plane_intersection
		const n1 = this.normal
		const h1 = this.d;
		const n2 = plane.normal;
		const h2 = plane.d;

		if (n1.eq(n2)) {
			if (h1 === h2) return plane.clone(); // same plane
			return; // parallel
		}

		const dot = n1.dot(n2);
		const denom = 1 - dot * dot;

		const c1 = (h1 - h2 * dot) / denom;
		const c2 = (h2 - h1 * dot) / denom;
		const point = n1.mulScalar(c1).add(n2.mulScalar(c2));

		return new Line(point, n1.cross(n2));
	}

	// clip(edge: Edge): Edge | undefined {
	// 	const ta = this.distance(edge.a);
	// 	const tb = this.distance(edge.b);
	// 	if (ta >= 0 && tb >= 0) return edge;
	// 	if (ta < 0 && tb < 0) return;

	// 	const dir = edge.dir().normalize();
	// 	const line = new Line(edge.a, dir);
	// 	const p = this.intersectLine(line);

	// 	if (p instanceof Line) return edge; // parallel, should be checked for earlier
	// 	if (!p) return edge; // No intersection

	// 	return new Edge(ta > 0 ? edge.a : edge.b, p);
	// }

	flip() {
		return new Plane(this.normal.mulScalar(-1), -this.d);
	}

	clone() {
		return new Plane(this.normal.clone(), this.d);
	}
}

