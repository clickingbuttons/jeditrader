import { vec3, Vec3 } from './util.js';

export class Plane {
	static epsilon = 1e-5;
	normal: Vec3;
	w: number;

	constructor(normal: Vec3, w: number) {
		this.normal = normal;
		this.w = w;
	}

	flip(): Plane {
		return new Plane(vec3.negate(this.normal), -this.w);
	}
}
