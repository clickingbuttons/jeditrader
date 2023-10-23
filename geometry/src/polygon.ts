import { Plane } from './plane.js';
import { Vertex } from './vertex.js';
import { Color } from './color.js';
import { Edge } from './edge.js';
import { Vec3, Line } from '@jeditrader/linalg';

export type Range<T> = {
	min: T;
	max: T;
};

// Represents a convex polygon. The >= 3 vertices used to initialize a polygon must be coplanar and
// form a convex counter-clockwise loop.
//
// Color will be applied to vertices unless they have their own color.
export class Polygon {
	vertices: Vertex[];
	plane: Plane;
	color?: Color;

	constructor(vertices: Vertex[], color?: Color) {
		if (vertices.length < 3)
			throw new Error(`a polygon must have at least 3 vertices, got ${vertices.length}`);
		this.vertices = vertices;
		this.plane = Plane.fromPoints(vertices[0], vertices[1], vertices[2]);
		this.color = color;
	}

	clone(): Polygon {
		return new Polygon(this.vertices.map(v => v.clone()), this.color);
	}

	flip(): Polygon {
		return new Polygon(this.vertices.reverse(), this.color);
	}

	edges(): Edge[] {
		const res: Edge[] = [];

		const len = this.vertices.length;
		for (let i = 0; i < len; i++) {
			const v1 = this.vertices[i];
			v1.color = v1.color ?? this.color;
			const v2 = this.vertices[(i + 1) % len];
			v2.color = v2.color ?? this.color;
			res.push(new Edge(v1, v2));
		}

		return res;
	}

	isEmpty(): boolean {
		return this.vertices.length == 0;
	}

	clip(planes: Plane[]): Polygon | undefined {
		// https://en.wikipedia.org/wiki/Sutherland%E2%80%93Hodgman_algorithm
		let outputList = this.vertices.slice();

		for (let c = 0; c < planes.length; c++) {
			const inputList = outputList;
			outputList = [];

			for (let i = 0; i < inputList.length; i++) {
				const p2 = inputList[(i + 1) % inputList.length];
				const p1 = inputList[i];
				const D1 = planes[c].distance(p1);
				const D2 = planes[c].distance(p2);
				const line = Line.fromPoints(p1, p2);
				const intersection = planes[c].intersectLine(line);

				if (D2 > 0) {
					if (D1 < 0 && intersection instanceof Vec3) outputList.push(new Vertex(intersection));
					outputList.push(p2);
				} else if (D1 > 0 && intersection instanceof Vec3) {
					outputList.push(new Vertex(intersection));
				}
			}
		}
		if (outputList.length >= 3) return new Polygon(outputList);
	}

	range(): Range<Vertex> {
		let res = {
			min: new Vertex(new Vec3(Number.MAX_VALUE)),
			max: new Vertex(new Vec3(Number.MIN_VALUE)),
		};

		for (let i = 0; i < this.vertices.length; i++) {
			const v = this.vertices[i];
			for (let j = 0; j < v.length; j++) {
				if (v[j] < res.min[j]) res.min[j] = v[j];
				if (v[j] > res.max[j]) res.max[j] = v[j];
			}
		}

		return res;
	}
}

