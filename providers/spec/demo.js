import { generate, Vec2 } from '@jeditrader/providers';

function uniform(min, max) {
	return min + Math.random() * (max - min);
}

describe('demo', () => {
	xit('generates', () => {
		const from = new Vec2(new Date(2004, 1).getTime(), uniform(50, 100));
		const to = new Vec2(new Date().getTime(), uniform(50, 100));
		const turns = [
			new Vec2(1 / 9, 2 / 3),
			new Vec2(5 / 9, 1 / 3),
		];
		const acc = {};
		generate(acc, 10, from, to, turns);
	});
});
