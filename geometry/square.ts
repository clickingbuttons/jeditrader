import { Polygon } from './polygon.js';

export class Square extends Polygon {
	constructor() {
		super([
			[-0.5,  0.5, 0.0],
			[-0.5, -0.5, 0.0],
			[ 0.5, -0.5, 0.0],
			[ 0.5,  0.5, 0.0],
		]);
	}
}
