// Do you know a good small testing lib with 0 deps?
// If so use it here...
import { vec3 } from './util.js';
import { Plane } from './plane.js';
import { Polygon, PolygonType } from './polygon.js';
import { Cube } from './cube.js';
import { Sphere } from './sphere.js';

function assertEq(actual: any, expected: any) {
	if (typeof expected === 'number' || typeof expected === 'string') {
		if (expected !== actual) throw new Error(`expected ${expected}, got ${actual}`);
	} else if (Array.isArray(expected) && Array.isArray(actual)) {
		if (expected.length !== actual.length) throw new Error(`length mismatch. expected ${expected.length}, got ${actual.length}`);
		for (var i = 0; i < expected.length; i++) {
			try {
				assertEq(expected[i], actual[i]);
			} catch (e) {
				throw new Error(`${e} at index ${i}`);
			}
		}
	} else {
		for (var p in expected) {
			if (!expected.hasOwnProperty(p)) continue;
			if (!actual.hasOwnProperty(p)) throw new Error(`${actual} missing expect property ${p}`);
			try {
				assertEq(expected[p], actual[p]);
			} catch (e) {
				throw new Error(`${e} for property ${p}`);
			}
		}
	}
}

const yaxisPlane = new Plane([1, 0, 0], 0);
const xyPlane = new Plane([0, 0, 1], 0);
const xySquare = new Polygon([
	[-1, -1, 0],
	[-1,  1, 0],
	[ 1,  1, 0],
	[ 1, -1, 0]
]);

{
	const flipped = xySquare.flip();
	assertEq(flipped.points[0][0], xySquare.points[xySquare.points.length - 1][0]);
	assertEq(vec3.dot(flipped.plane.normal, xySquare.plane.normal), -1);
}

{
	const { types, type } = xySquare.splitType(yaxisPlane);
	assertEq(type, PolygonType.spanning);
	assertEq(types, [
		PolygonType.back,
		PolygonType.back,
		PolygonType.front,
		PolygonType.front
	]);

	const [cFront, cBack, front, back] = xySquare.split(yaxisPlane);
	assertEq(cFront.length, 0);
	assertEq(cBack.length, 0);
	assertEq(front.length, 1);
	assertEq(back.length, 1);

	assertEq(back[0].points[2][0], 0);
	assertEq(back[0].points[2][1], 1);
	assertEq(back[0].points[3][0], 0);
	assertEq(back[0].points[3][1], -1);

	assertEq(front[0].points[3][0], 0);
	assertEq(front[0].points[3][1], -1);
	assertEq(front[0].points[0][0], 0);
	assertEq(front[0].points[0][1], 1);
}

{
	const plane = new Plane([...yaxisPlane.normal], 2);
	const { type } = xySquare.splitType(plane);
	assertEq(type, PolygonType.back);
	const [cFront, cBack, front, back] = xySquare.split(plane);
	assertEq(cFront.length, 0);
	assertEq(cBack.length, 0);
	assertEq(front.length, 0);
	assertEq(back.length, 1);
}

{
	const plane = new Plane([...yaxisPlane.normal], -2);
	const { type } = xySquare.splitType(plane);
	assertEq(type, PolygonType.front);
	const [cFront, cBack, front, back] = xySquare.split(plane);
	assertEq(cFront.length, 0);
	assertEq(cBack.length, 0);
	assertEq(front.length, 1);
	assertEq(back.length, 0);
}

{
	const { type } = xySquare.splitType(xyPlane);
	assertEq(type, PolygonType.coplanar);
	const [cFront, cBack, front, back] = xySquare.split(xyPlane);
	assertEq(cFront.length, 0);
	assertEq(cBack.length, 1);
	assertEq(front.length, 0);
	assertEq(back.length, 0);
}

{
	const { type } = xySquare.splitType(xyPlane);
	assertEq(type, PolygonType.coplanar);
	const [cFront, cBack, front, back] = xySquare.split(xyPlane.flip());
	assertEq(cFront.length, 1);
	assertEq(cBack.length, 0);
	assertEq(front.length, 0);
	assertEq(back.length, 0);
}

{
	const cube = new Cube();
	assertEq(cube.polygons.length, 6);
	assertEq(cube.polygons[0],
		new Polygon([
			[-1, -1, -1],
			[-1, -1,  1],
			[-1,  1,  1],
			[-1,  1, -1],
		]),
	);

	const sphere = new Sphere([0.25, 0.25, 0.25], 1.3);
	assertEq(sphere.polygons.length, 128);

	const added = cube.union(sphere);
	assertEq(added.polygons.length, 231);
}

// Example on https://evanw.github.io/csg.js/
// {
// 	const cube = new Cube();
//
// 	const sphere = new Sphere([0, 0, 0], 1.35);
// 	assertEq(sphere.polygons.length, 128);
// 	assertEq(sphere.polygons[0],
// 		new Polygon([
// 			[0, 1.350000023841858, 0],
// 			[0.4772970676422119, 1.2472373247146606, 0.19770292937755585],
// 			[0.5166226625442505, 1.2472373247146606, 0],
// 		]),
// 	);
//
// 	const subbed = cube.subtract(sphere);
// 	assertEq(subbed.polygons.length, 247);
// 	assertEq(subbed.polygons[0],
// 		new Polygon([
// 			[-1, 0.791345943969079, 1],
// 			[-1, 1, 1],
// 			[-1, 1, 0.6877271373405955],
// 		]),
// 	);
// }
//
