import { Vec3 } from '@jeditrader/linalg';

// Represents a vertex of a polygon. Use your own vertex class instead of this
// one to provide additional features like texture coordinates and vertex
// colors. Custom vertex classes need to provide a `pos` property and `clone()`,
// `flip()`, and `interpolate()` methods that behave analogous to the ones
// defined by `Vertex`. This class provides `normal` so convenience
// functions like `sphere()` can return a smooth vertex normal, but `normal`
// is not used anywhere else.
export class Vertex extends Vec3 {
	normal?: Vec3;

	constructor(pos: Vec3, normal?: Vec3) {
		super(pos.x, pos.y, pos.z);
		this.normal = normal;
	}

	clone(): Vertex {
		return new Vertex(this.clone(), this.normal?.clone());
	}

	// Invert all orientation-specific data (e.g. vertex normal). Called when the
	// orientation of a polygon is flipped.
	flip(): void {
		this.normal = this.normal?.mulScalar(-1);
	}

	// Create a new vertex between this vertex and `other` by linearly
	// interpolating all properties using a parameter of `t`. Subclasses should
	// override this to interpolate additional properties.
	interpolate(other: Vertex, t: number) {
		return new Vertex(
			this.lerp(other, t),
			(this.normal && other.normal) ? this.normal.lerp(other.normal, t) : undefined
		);
	}
}

