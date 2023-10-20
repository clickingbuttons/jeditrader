import { Edge as EdgeBase } from '@jeditrader/linalg';
import { Vertex } from './vertex.js';

export class Edge extends EdgeBase {
	declare a: Vertex;
	declare b: Vertex;

	constructor(a: Vertex, b: Vertex) {
		super(a, b);
	}
}
