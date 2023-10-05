import { Vec3 } from './vec3.js';

export class Circle {
	center: Vec3;
	radius: number;

	constructor(center: Vec3, radius: number) {
		this.center = center;
		this.radius = radius;
	}
}
