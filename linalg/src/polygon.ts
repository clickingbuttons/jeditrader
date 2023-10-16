import { Vec3 } from '@jeditrader/linalg';
import { Edge } from './edge.js';

export class Polygon {
	vertices: Vec3[];

	constructor(vertices: Vec3[]) {
		if (vertices.length < 3)
			throw new Error(`a polygon must have at least 3 vertices, got ${vertices.length}`);
		this.vertices = vertices;
	}

	edges(): Edge[] {
		const res: Edge[] = [];
		const len = this.vertices.length;
		for (let i = 0; i < len; i++) {
			res.push(new Edge(this.vertices[i], this.vertices[(i + 1) % len]));
		}
		return res;
	}

	isClockwise(): boolean {
		const sum = this.edges()
			.map(e => (e.b.x - e.a.x) * (e.b.y + e.a.y))
			.reduce((acc, cur) => acc + cur, 0);

		return sum >= 0;
	}
}
