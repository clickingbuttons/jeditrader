import { Vec3 } from '@jeditrader/linalg';

export class Edge {
	p1: Vec3;
	p2: Vec3;

	constructor(p1: Vec3, p2: Vec3) {
		this.p1 = p1;
		this.p2 = p2;
	}

	dir(): Vec3 {
		return this.p2.sub(this.p1);
	}
}
