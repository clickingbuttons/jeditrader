import { Polygon } from './polygon.js';
import { Node } from './node.js';
import { Vec3 } from '@jeditrader/linalg';

// Constructive Solid Geometry (CSG) is a modeling technique that uses Boolean
// operations like union and intersection to combine 3D solids. This library
// implements CSG operations on meshes elegantly and concisely using BSP trees,
// and is meant to serve as an easily understandable implementation of the
// algorithm. All edge cases involving overlapping coplanar polygons in both
// solids are correctly handled.
//
// Example usage:
//
//     var cube = CSG.cube();
//     var sphere = CSG.sphere({ radius: 1.3 });
//     var polygons = cube.subtract(sphere).toPolygons();
//
// ## Implementation Details
//
// All CSG operations are implemented in terms of two functions, `clipTo()` and
// `invert()`, which remove parts of a BSP tree inside another BSP tree and swap
// solid and empty space, respectively. To find the union of `a` and `b`, we
// want to remove everything in `a` inside `b` and everything in `b` inside `a`,
// then combine polygons from `a` and `b` into one solid:
//
//     a.clipTo(b);
//     b.clipTo(a);
//     a.build(b.allPolygons());
//
// The only tricky part is handling overlapping coplanar polygons in both trees.
// The code above keeps both copies, but we need to keep them in one tree and
// remove them in the other tree. To remove them from `b` we can clip the
// inverse of `b` against `a`. The code for union now looks like this:
//
//     a.clipTo(b);
//     b.clipTo(a);
//     b.invert();
//     b.clipTo(a);
//     b.invert();
//     a.build(b.allPolygons());
//
// Subtraction and intersection naturally follow from set operations. If
// union is `A | B`, subtraction is `A - B = ~(~A | B)` and intersection is
// `A & B = ~(~A | ~B)` where `~` is the complement operator.
export class CSG {
	polygons: Polygon[];

	constructor(polygons: Polygon[]) {
		this.polygons = polygons;
	}

	clone() {
		return new CSG(this.polygons.map(p => p.clone()));
	}

	toPolygons() {
		return this.polygons;
	}

	union(csg: CSG): CSG {
		var a = new Node(this.clone().polygons);
		var b = new Node(csg.clone().polygons);
		a.clipTo(b);
		b.clipTo(a);
		b.invert();
		b.clipTo(a);
		b.invert();
		a.build(b.allPolygons());
		return new CSG(a.allPolygons());
	}

	subtract(csg: CSG): CSG {
		var a = new Node(this.clone().polygons);
		var b = new Node(csg.clone().polygons);
		a.invert();
		a.clipTo(b);
		b.clipTo(a);
		b.invert();
		b.clipTo(a);
		b.invert();
		a.build(b.allPolygons());
		a.invert();
		return new CSG(a.allPolygons());
	}

	intersect(csg: CSG): CSG {
		var a = new Node(this.clone().polygons);
		var b = new Node(csg.clone().polygons);
		a.invert();
		b.clipTo(a);
		b.invert();
		a.clipTo(b);
		b.clipTo(a);
		a.build(b.allPolygons());
		a.invert();
		return new CSG(a.allPolygons());
	}

	invert(): CSG {
		return new CSG(this.polygons.map(p => p.flip()));
	}

	toIndexedTriangles() {
		const defaultColor = new Vec3(255, 255, 255);
		const positions: number[] = [];
		const normals: number[] = [];
		const indices: number[] = [];
		const colors: number[] = [];
		const indicesMap: { [v: string] : number } = {};

		for (var i = 0; i < this.polygons.length; i++) {
			var poly = this.polygons[i];

			// Map each unique vertex to an index.
			var polyIndices: number[] = [];
			for (var j = 0; j < poly.vertices.length; j++) {
				var vert = poly.vertices[j];

				var key = JSON.stringify(vert);
				if (!(key in indicesMap)) {
					indicesMap[key] = positions.length / 3;
					positions.push(...vert);
					normals.push(...vert.normal);
					colors.push(...(vert.color ?? defaultColor), 255);
				}
				polyIndices.push(indicesMap[key]);
			}

			for (var j = 2; j < polyIndices.length; j++) {
				indices.push(polyIndices[0], polyIndices[j - 1], polyIndices[j]);
			}
		}

		return {
			positions,
			normals,
			colors,
			indices,
		};
	}
}

