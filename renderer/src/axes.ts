import { Camera } from './camera.js';
import { Mesh, ShaderBinding } from './mesh.js';
import { Range } from '@jeditrader/providers';
import { Vec3 } from '@jeditrader/linalg';
import { CSG, Polygon, Vertex } from '@jeditrader/geometry';
import { createBuffer } from './util.js';

const indices = [
	0, 1, 2,
	2, 3, 0,
];

class BoundedPlane extends CSG {
	constructor(min = new Vec3(0, 0, 0), max = new Vec3(1, 1, 1)) {
		super([
			new Polygon([
				new Vertex(new Vec3(min.x, min.y, 0)),
				new Vertex(new Vec3(min.x, max.y, 0)),
				new Vertex(new Vec3(max.x, max.y, 0)),

				new Vertex(new Vec3(min.x, max.y, 0)),
				new Vertex(new Vec3(max.x, min.y, 0)),
				new Vertex(new Vec3(min.x, min.y, 0)),
			])
		]);
	}
}

export class Axes extends Mesh {
	static defaultRange = {
		min: new Vec3(-5000, -5000, -5000),
		max: new Vec3(5000, 5000, 5000)
	};
	range: Range<Vec3> = Axes.defaultRange;
	positions: GPUBuffer;

	static getGeometry(range: Range<Vec3> = Axes.defaultRange) {
		const min = [range.min.x, range.min.y];
		const max = [range.max.x, range.max.y];

		return [
			// cw from bottom left
			min[0], min[1],
			min[0], max[1],
			max[0], max[1],
			max[0], min[1],
		];
	}

	constructor(device: GPUDevice, camera: Camera) {
		const positions = createBuffer({
			device,
			data: new Float32Array(Axes.getGeometry()),
		});

		super(
			device,
			camera,
			ShaderBinding.positions(positions, 2),
			ShaderBinding.indices(device, indices),
			ShaderBinding.colors(createBuffer({ device, data: new Float32Array([0.2, 0.2, 0.2]) }), 0),
			false
		);
		this.positions = positions;
	}

	setRange(range: Range<Vec3>) {
		const positions = new Float32Array(Axes.getGeometry(range));
		this.device.queue.writeBuffer(this.positions, 0, positions);
	}
}
