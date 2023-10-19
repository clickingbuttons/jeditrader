import { diagonalize, upperEchelon } from '@jeditrader/linalg';

describe('gauss elimination', () => {

let M;
beforeEach(() => {
	// http://mathworld.wolfram.com/GaussianElimination.html
	M = [
		[9, 3, 4, 7],
		[4, 3, 4, 8],
		[1, 1, 1, 3]
	];
});

it('diagonalizes', () => {
	diagonalize(M);
	expect(M).toEqual([
		[9, 3, 4, 7],
		[0, 1.6666666666666667, 2.2222222222222223, 4.888888888888889],
		[0, 0, -0.33333333333333337, 0.2666666666666666]
	]);
});

it('upperEchelon', () => {
	diagonalize(M);
	upperEchelon(M);
	expect(M).toEqual([
		[1, 0, 0, -0.19999999999999987],
		[0, 1, 0, 3.9999999999999996],
		[0, 0, 1, -0.7999999999999997]
	]);
});

it('no solution', () => {
	const A = [
		[0, 0, 1, 0],
		[0, 0, 1, 1],
		[0, 0, 1, 2],
	];
	diagonalize(A);
	upperEchelon(A);
	expect(A).toEqual([
		[1, 0, 0, NaN],
		[0, 1, 0, NaN],
		[0, 0, 1, NaN]
	]);
});

});
