import { Vec3 } from '@jeditrader/linalg';

export class Line {
	point: Vec3;
	dir: Vec3;

	constructor(dir: Vec3, point: Vec3) {
		this.point = point;
		this.dir = dir;
	}
}
