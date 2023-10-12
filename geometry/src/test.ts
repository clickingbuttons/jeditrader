import { Vec3 } from '@jeditrader/linalg';
import { Cube, Sphere, Vertex } from './index.js';

// Do you know a good small testing lib?
// If so use it instead of this function...
function assertEq(actual: any, expected: any) {
	if (typeof expected === 'number') {
		if (expected.toFixed(5) != actual.toFixed(5)) throw new Error(`expected ${expected.toFixed(5)}, got ${actual.toFixed(5)}`);
	} else if (typeof expected === 'string') {
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
			if (!actual || !actual.hasOwnProperty(p)) throw new Error(`${actual} missing expect property ${p}`);
			try {
				assertEq(expected[p], actual[p]);
			} catch (e) {
				throw new Error(`${e} for property ${p}`);
			}
		}
	}
}

// Example on https://evanw.github.io/csg.js/
{
	const cube = new Cube();

	const sphere = new Sphere({ radius: 1.35 });
	assertEq(sphere.polygons.length, 128);
	assertEq(sphere.polygons[0].vertices,
		[
			new Vertex(new Vec3(0, 1.35, 0), new Vec3(0)),
			new Vertex(new Vec3(0.477297, 1.247237, 0.1977), new Vec3(0)),
			new Vertex(new Vec3(0.516622, 1.247237, 0), new Vec3(0)),
		],
	);

	const subbed = cube.subtract(sphere);
	assertEq(subbed.polygons.length, 247);
	assertEq(subbed.polygons[0].vertices,
		[
			new Vertex(new Vec3(-1, 0.79135, 1), new Vec3(0)),
			new Vertex(new Vec3(-1, 1, 1), new Vec3(0)),
			new Vertex(new Vec3(-1, 1, 0.687727), new Vec3(0)),
		],
	);
}
