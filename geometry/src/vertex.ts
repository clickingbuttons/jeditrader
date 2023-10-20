import { Vec3 } from '@jeditrader/linalg';
import { Color } from './color.js';

export class Vertex extends Vec3 {
	normal?: Vec3;
	color?: Color;

	constructor(pos: Vec3, { normal, color }: { normal?: Vec3, color?: Color } = {}) {
		super(pos.x, pos.y, pos.z);
		this.normal = normal;
		this.color = color;
	}

	clone(): Vertex {
		return new Vertex(super.clone(), { normal: this.normal?.clone(), color: this.color?.clone() });
	}

	flip(): Vertex {
		return new Vertex(super.clone(), { normal: this.normal?.mulScalar(-1), color: this.color?.clone() });
	}

	lerp(other: Vertex, t: number): Vertex {
		return new Vertex(
			super.lerp(other, t),
			{
				normal: other.normal && this.normal?.lerp(other.normal, t),
				color: other.color && this.color?.lerp(other.color, t),
			}
		);
	}
}

