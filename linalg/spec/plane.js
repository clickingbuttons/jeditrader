import { Vec3, Plane, Line, diagonalize, upperEchelon } from '@jeditrader/linalg';

describe('plane', () => {

const y0 = new Plane(new Vec3(0, 1, 0), 0);
const z0 = new Plane(new Vec3(0, 0, 1), 0);
it('samples point', () => {
	expect(z0.point()).toEqual(new Vec3(0, 0, 0));
	const planes = [
		new Plane(new Vec3(0, 0, 1), 10),
		new Plane(new Vec3(0, 1, 0), 10),
		new Plane(new Vec3(1, 0, 0), 10),
		new Plane(new Vec3(1, 1, 0), 10),
	];
	planes.forEach(p => expect(p.point().dot(p.normal)).toEqual(p.d));
});

it('distance to point', () => {
	expect(z0.distance(new Vec3(0, 0, 0))).toBe(0);
	expect(z0.distance(new Vec3(0, 0, 1))).toBe(1);
	expect(z0.distance(new Vec3(1, 1, 1))).toBe(1);
});

it('line intersection at point', () => {
	const l = new Line(new Vec3(1), new Vec3(-1));
	expect(z0.intersectLine(l)).toEqual(new Vec3(0));
});

it('line intersection on line', () => {
	const l = new Line(new Vec3(1, 0, 0), new Vec3(0));
	expect(z0.intersectLine(l)).toEqual(l);
});

it('no line intersection', () => {
	const l = new Line(new Vec3(1, 0, 0), new Vec3(1));
	expect(z0.intersectLine(l)).toBeUndefined();
});

it('simple plane intersection on line', () => {
	const l = new Line(new Vec3(-1, 0, 0), new Vec3(0));
	expect(z0.intersectPlane(y0)).toEqual(l);
});

it('plane intersection on line', () => {
	const p0 = Plane.fromEquation(1, 1, 1, 1);
	const p1 = Plane.fromEquation(1, 2, 3, 4);

	const l = p0.intersectPlane(p1);
	expect(p0.normal.dot(l.point)).toBeCloseTo(p0.d, 7);
	expect(p1.normal.dot(l.point)).toBeCloseTo(p1.d, 7);
});

it('plane intersection on plane', () => {
	expect(z0.intersectPlane(z0)).toEqual(z0);
});

it('no plane intersection', () => {
	expect(z0.intersectPlane(new Plane(z0.normal, z0.d + 1))).toBeUndefined();
});

});
