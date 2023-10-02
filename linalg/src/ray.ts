import { Vec3 } from './vec3.js';

export class Ray {
	point: Vec3;
	dir: Vec3;

	constructor(point: Vec3, dir: Vec3) {
		this.point = point;
		this.dir = dir;
	}
}
