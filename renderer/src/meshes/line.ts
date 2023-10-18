import { Edge } from '@jeditrader/linalg';
import { LineResources } from '../materials/index.js';
import { createBuffer, toF64 } from '../util.js';

export class Line {
	resources: LineResources;

	nVertices: number;

	constructor(device: GPUDevice, edges: Edge[]) {
		// Don't optimize indexes for now.
		this.resources = {
			positions: {
				buffer: createBuffer({ device, data: toF64(edges.map(e => [e.a, e.b]).flat()) }),
			},
		};
		this.nVertices = edges.length * 2;
	}

	draw(pass: GPURenderPassEncoder) {
		pass.draw(this.nVertices);
	}
}
