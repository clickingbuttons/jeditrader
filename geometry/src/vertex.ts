import { Vec3 } from '@jeditrader/linalg';

export class Vertex extends Vec3 {
	normal: Vec3;

	constructor(pos: Vec3, normal: Vec3) {
		super(pos.x, pos.y, pos.z);
		this.normal = normal;
	}

	clone(): Vertex {
		return new Vertex(this.clone(), this.normal.clone());
	}

	// TODO: make not mutate
	flip(): void {
		this.normal = this.normal.mulScalar(-1);
	}

	lerp(other: Vertex, t: number): Vertex {
		return new Vertex(
			this.lerp(other, t),
			this.normal.lerp(other.normal, t)
		);
	}
}

