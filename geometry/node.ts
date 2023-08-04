import { Plane } from './plane.js';
import { Polygon } from './polygon.js';

export class Node {
	polygons: Polygon[];
	plane: Plane;
	front?: Node;
	back?: Node;

	constructor(polygons: Polygon[], node?: Node) {
		this.polygons = polygons;
		this.plane = node?.plane ?? polygons[0]?.plane;

		const split = polygons.reduce(
			(acc, polygon) => {
				const [
					coplanarFront,
					coplanarBack,
					frontSplit,
					backSplit
				] = polygon.split(this.plane);
				return {
					polygons: acc.polygons.concat(coplanarFront.concat(coplanarBack)),
					front: acc.front.concat(frontSplit),
					back: acc.back.concat(backSplit)
				};
			},
			{
				polygons: node?.polygons ?? polygons,
				front: [] as Polygon[],
				back: [] as Polygon[]
			}
		);
		this.front = split.front.length > 0 ? new Node(split.front, node?.front) : node?.front;
		this.back = split.back.length > 0 ? new Node(split.back, node?.back) : node?.back;
	}

	all(): Polygon[] {
		return this.polygons
			.concat(this.front ? this.front.all() : [])
			.concat(this.back ? this.back.all() : []);
	}

	clip(polygons: Polygon[]): Polygon[] {
		const split = [...polygons].reduce(
			(acc, polygon) => {
				const [
					coplanarFront,
					coplanarBack,
					frontSplit,
					backSplit
				] = polygon.split(this.plane);
				return {
					front: acc.front.concat(coplanarFront).concat(frontSplit),
					back: acc.back.concat(coplanarBack).concat(backSplit)
				};
			},
			{ front: [] as Polygon[], back: [] as Polygon[] }
		);
		const front: Polygon[] = this.front ? this.front.clip(split.front) : split.front;
		const back: Polygon[] = this.back ? this.back.clip(split.back) : [];

		return front.concat(back);
	}

	clipTo(node: Node): Node {
		const res = new Node(node.plane ? node.clip(this.polygons) : this.polygons);
		res.plane = this.plane;
		res.front = this.front ? this.front.clipTo(node) : undefined;
		res.back = this.back ? this.back.clipTo(node) : undefined;
		return res;
	}

	invert(): Node {
		const res = new Node(this.polygons.map(p => p.flip()));
		res.plane = this.plane.flip();
		res.front = this.back ? this.back.invert() : undefined;
		res.back = this.front ? this.front.invert() : undefined;
		return res;
	}

	union(node: Node): Node {
		console.log('a', this)
		const clippedA = this.clipTo(node);
		console.log('?clippedA', clippedA);
		const clippedB = node.clipTo(clippedA).invert().clipTo(clippedA).invert();
		console.log('?clippedB', clippedB);
		return new Node(clippedB.all(), clippedA);
	}

	subtract(node: Node): Node {
		const clippedA = this.invert().clipTo(node);
		const clippedB = node.clipTo(clippedA).invert().clipTo(clippedA).invert();
		return new Node(clippedB.all(), clippedA).invert();
	}
}
