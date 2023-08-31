export class Vec2 {
	// TODO: bench best backing store
	x: number;
	y: number;

	constructor(x: number, y: number) {
		this.x = x;
		this.y = y;
	}

	clone(): Vec2 {
		return new Vec2(this.x, this.y);
	}

	add(v: Vec2): Vec2 {
		return new Vec2(this.x + v.x, this.y + v.y);
	}

	sub(v: Vec2): Vec2 {
		return new Vec2(this.x - v.x, this.y - v.y);
	}

	mult(v: Vec2): Vec2 {
		return new Vec2(this.x * v.x, this.y * v.y);
	}

	div(v: Vec2): Vec2 {
		return new Vec2(this.x / v.x, this.y / v.y);
	}

	mulScalar(n: number): Vec2 {
		return new Vec2(this.x * n, this.y * n);
	}

	divScalar(n: number): Vec2 {
		return new Vec2(this.x / n, this.y / n);
	}

	dot(v: Vec2): number {
		return (this.x * v.x) + (this.y * v.y);
	}

	normalize(): Vec2 {
		const len = Math.sqrt(this.x ** 2 + this.y ** 2);
		if (len > 1e-5) {
			return new Vec2(
				this.x / len,
				this.y / len,
			);
		}
		return new Vec2(0, 0);
	}

	lerp(v: Vec2, t: number): Vec2 {
		return new Vec2(
			this.x + t * (v.x - this.x),
			this.y + t * (v.y - this.y),
		);
	}

	elements(): [number, number] {
		return [this.x, this.y];
	}

	elementsLow(): [number, number] {
		return this.elements().map(v => v - Math.fround(v)) as [number, number];
	}

	f32(): Float32Array {
		return new Float32Array(this.elements());
	}

	f32Low(): Float32Array {
		return new Float32Array(this.elementsLow());
	}
}
