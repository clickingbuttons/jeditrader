import { Edge, Color } from '@jeditrader/geometry';
import { LineResources } from '../materials/index.js';
import { createBuffer, toF64, concatTypedArrays } from '../util.js';

export class Line {
	resources: LineResources;

	nVertices: number;

	constructor(device: GPUDevice, edges: Edge[]) {
		// TODO: optimize indices
		const defaultColor = Color.white;
		const allEdges = edges.map(e => [e.a, e.b]).flat();
		const allColors = allEdges.map(e => e.color ?? defaultColor);
		this.resources = {
			positions: {
				buffer: createBuffer({ device, data: toF64(allEdges) }),
			},
			colors: {
				buffer: createBuffer({ device, data: new Uint8Array(concatTypedArrays(allColors)) }),
			},
		};
		this.nVertices = edges.length * 2;
	}

	draw(pass: GPURenderPassEncoder) {
		pass.draw(this.nVertices);
	}
}
