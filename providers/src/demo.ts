import { Aggregate, Period, Provider, Trade } from './provider.js';

// Avoid dep on @jeditrader/linalg
export class Vec2 extends Float64Array {
	get x() { return this[0]; }
	get y() { return this[1]; }
	set x(n: number) { this[0] = n; }
	set y(n: number) { this[1] = n; }

	constructor(x: number, y: number) {
		super([x, y]);
	}

	add(v: Vec2): Vec2 {
		return new Vec2(this.x + v.x, this.y + v.y);
	}
}

function shuffle(array: any[]) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
}

// http://stackoverflow.com/questions/25067096/how-to-generate-a-fractal-graph-of-a-market-in-python
export function generate(acc: { [k: number]: Vec2 }, depth: number, start: Vec2, end: Vec2, turns: Vec2[]) {
	acc[start.x] = new Vec2(start.x, start.y);
	acc[end.x] = new Vec2(end.x, end.y);

	if (depth == 0) return;

	const diffs: Vec2[] = [];
	let last = start;
	for (let i = 0; i < turns.length; i++) {
		const new_time = start.x + (end.x - start.x) * turns[i].x;
		const new_val = start.y + (end.y - start.y) * turns[i].y;
		last = new Vec2(new_time - last.x, new_val - last.y);
		diffs.push(last);
	}

	// add 'brownian motion' by reordering the segments
	shuffle(diffs)

	// calculate actual intermediate points and recurse
	last = start;
	for (let i = 0; i < diffs.length; i++) {
		const p = last.add(diffs[i]);
		generate(acc, depth - 1, last, p, turns)
		last = p;
	}
	generate(acc, depth - 1, last, end, turns)
}

export class Demo implements Provider {
	year(ticker: string, from: Date, to: Date, onData: (aggs: Aggregate[]) => void) {
	}

	month(ticker: string, from: Date, to: Date, onData: (aggs: Aggregate[]) => void) {
	}

	week(ticker: string, from: Date, to: Date, onData: (aggs: Aggregate[]) => void) {
	}

	day(ticker: string, from: Date, to: Date, onData: (aggs: Aggregate[]) => void) {
	}

	hour4(ticker: string, from: Date, to: Date, onData: (aggs: Aggregate[]) => void) {
	}

	hour(ticker: string, from: Date, to: Date, onData: (aggs: Aggregate[]) => void) {
	}

	minute5(ticker: string, from: Date, to: Date, onData: (aggs: Aggregate[]) => void) {
	}

	minute(ticker: string, from: Date, to: Date, onData: (aggs: Aggregate[]) => void) {
	}

	second(ticker: string, from: Date, to: Date, onData: (aggs: Aggregate[]) => void) {
	}

	trade(ticker: string, from: Date, to: Date, onData: (trades: Trade[]) => void) {
	}
}
