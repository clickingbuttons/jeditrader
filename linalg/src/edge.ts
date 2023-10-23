import { Vec3, Line } from '@jeditrader/linalg';

export class Edge {
	a: Vec3;
	b: Vec3;

	constructor(a: Vec3, b: Vec3) {
		this.a = a;
		this.b = b;
	}

	dir(): Vec3 {
		return this.b.sub(this.a);
	}

	lineIntersection(l: Line): Vec3 | undefined {
		const thisLine = Line.fromPoints(this.a, this.b);
		const res = thisLine.intersection(l);
		if (res?.every(e => e <= 1)) return res;
		return;
	}
}
