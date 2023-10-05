import { Vec3 } from '@jeditrader/linalg';

export class Line {
	point: Vec3;
	dir: Vec3;

	constructor(point: Vec3, dir: Vec3) {
		this.point = point;
		this.dir = dir;
	}
}
