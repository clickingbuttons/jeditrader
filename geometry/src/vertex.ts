import { Vec3 } from '@jeditrader/linalg';

export class Vertex extends Vec3 {
	normal: Vec3;
	color?: Vec3;

	constructor(pos: Vec3, normal: Vec3, color?: Vec3) {
		super(pos.x, pos.y, pos.z);
		this.normal = normal;
		this.color = color;
	}

	clone(): Vertex {
		return new Vertex(super.clone(), this.normal.clone());
	}

	flip(): Vertex {
		return new Vertex(super.clone(), this.normal.mulScalar(-1));
	}

	lerp(other: Vertex, t: number): Vertex {
		return new Vertex(
			this.lerp(other, t),
			this.normal.lerp(other.normal, t)
		);
	}
}

