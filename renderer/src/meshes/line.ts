import { Edge } from '@jeditrader/linalg';
import { LineResources } from '../materials/index.js';
import { createBuffer, toF64 } from '../util.js';

export class Line {
	resources: LineResources;

	nVertices: number;

	constructor(device: GPUDevice, edges: Edge[]) {
		// Don't optimize indices for now.
		this.resources = {
			positions: {
				buffer: createBuffer({ device, data: toF64(edges.map(e => [e.p1, e.p2]).flat()) }),
			},
		};
		this.nVertices = edges.length * 2;
	}

	draw(pass: GPURenderPassEncoder) {
		pass.draw(this.nVertices);
	}
}
