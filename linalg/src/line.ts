import { Vec3 } from '@jeditrader/linalg';

export class Line {
	point: Vec3;
	dir: Vec3;

	constructor(point: Vec3, dir: Vec3) {
		this.point = point;
		this.dir = dir;
	}

	static fromPoints(a: Vec3, b: Vec3): Line {
		return new Line(a, b.sub(a));
	}

	intersection(l: Line): Vec3 | undefined {
		// mt + b = nt + c
		// mt - nt = c - b
		// t = (c - b) / (m - n)
		if (l.dir.cross(this.dir).magnitude() == 0) return; // parallel
		return l.point.sub(this.point).div(this.dir.sub(l.dir));
	}
}
