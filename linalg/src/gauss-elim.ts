function findPivot(M: number[][], h: number) {
	const m = M.length;
	let res = h;
	for (let i = h; i < m; i++) {
		if (Math.abs(M[i][h]) > Math.abs(M[res][h])) res = i;
	}
	return res;
}

// https://en.wikipedia.org/wiki/Gaussian_elimination#Pseudocode
/// Diagonalizes matrix in-place
export function diagonalize(M: number[][]) {
	const m = M.length;
	const n = M[0].length;

	let h = 0;
	let k = 0;

	while (h < m && k < n) {
		let pivot = findPivot(M, h);
		if (M[pivot][k] == 0) k += 1; // no pivot
		else {
			// Swap rows
			const tmp = M[h];
			M[h] = M[pivot];
			M[pivot] = tmp;

			for (let i = h + 1; i < m; i++) {
				const f = M[i][k] / M[h][k];
				// Fill lower part of pivot with 0s
				M[i][k] = 0;
				for (let j = k + 1; j < n; j++) M[i][j] -= M[h][j] * f;
			}
			h += 1;
			k += 1;
		}
	}
}

export function upperEchelon(M: number[][]) {
	const m = M.length;
	for (var i = m - 1; i >= 0; i--) {
		const x = M[i][m] / M[i][i];
		for (let j = i-1; j >= 0; j--) {
			M[j][m] -= x * M[j][i];
			M[j][i] = 0;
		}
		M[i][m] = x;
		M[i][i] = 1;
	}
}

export function gaussElim(M: number[][]): number[] {
	diagonalize(M);
	upperEchelon(M);
	const n = M[0].length;
	return M.map(row => row[n -1]);
}
