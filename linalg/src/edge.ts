import { Vec3 } from '@jeditrader/linalg';

export class Edge {
	a: Vec3;
	b: Vec3;

	constructor(a: Vec3, b: Vec3) {
		this.a = a;
		this.b = b;
	}

	dir(): Vec3 {
		return this.a.sub(this.b);
	}
}
