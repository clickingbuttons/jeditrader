import { Plane } from './plane.js';
import { vec3, Vec3 } from './util.js';

export enum PolygonType {
	coplanar,
	front,
	back,
	spanning
};

export class Polygon {
	points: Vec3[];
	plane: Plane;

	constructor(points: Vec3[], plane?: Plane) {
		this.points = points;
		if (plane) {
			this.plane = plane;
		} else {
			const [a, b, c] = points;
			const normal = vec3.normalize(vec3.cross(vec3.sub(b, a), vec3.sub(c, a)));
			this.plane = new Plane(normal, vec3.dot(normal, a));
		}
	}

	flip(): Polygon {
		return new Polygon(
			[...this.points].reverse(),
			this.plane.flip()
		);
	}

	splitType(plane: Plane): { type: PolygonType, types: PolygonType[] } {
		return this.points.reduce(
			(acc, cur) => {
				const t = vec3.dot(plane.normal, cur) - plane.w;
				let type = PolygonType.coplanar;
				if (t < -Plane.epsilon) type = PolygonType.back;
				else if (t > Plane.epsilon) type = PolygonType.front;

				return {
					type: acc.type | type,
					types: acc.types.concat(type)
				};
			},
			{
				types: [] as PolygonType[],
				type: PolygonType.coplanar,
			}
		);
	}

	splitCoplanar(plane: Plane): Polygon[][] {
		const d = vec3.dot(plane.normal, this.plane.normal);
		if (d > 0) return [[this], [], [], []];
		return [[], [this], [], []];
	}

	splitSpanning(plane: Plane, types: PolygonType[]) {
		const { f, b } = this.points.reduce(
			(acc, vector, i) => {
				const nextIdx = (i + 1) % this.points.length; // Cyclical next
				const nextVector = this.points[nextIdx];
				const span = (types[i] | types[nextIdx]) === PolygonType.spanning;
				const accc = {
					f: types[i] !== PolygonType.back ? [...acc.f, vector] : acc.f,
					b: types[i] !== PolygonType.front ? [...acc.b, vector] : acc.b
				};
				const tt = (plane.w - vec3.dot(plane.normal, vector)) /
					vec3.dot(plane.normal, vec3.sub(nextVector, vector));
				const v = vec3.lerp(vector, nextVector, tt);
				return span ? { f: [...accc.f, v], b: [...accc.b, v] } : accc;
			},
			{ f: [] as Vec3[], b: [] as Vec3[] }
		);
		return [
			[],
			[],
			f.length >= 3 ? [new Polygon(f)] : [],
			b.length >= 3 ? [new Polygon(b)] : []
		];
	}

	split(plane: Plane) {
		const { type, types } = this.splitType(plane);
		switch (type) {
			case PolygonType.coplanar: return this.splitCoplanar(plane);
			case PolygonType.front: return [[], [], [this], []];
			case PolygonType.back: return [[], [], [], [this]];
			default: return this.splitSpanning(plane, types);
		}
	}
}
