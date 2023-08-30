import { Camera } from './camera.js';
import { Mesh, ShaderBinding } from './mesh.js';
import { Range } from '@jeditrader/providers';
import { Vec3 } from '@jeditrader/linalg';
import { CSG, Polygon, Vertex } from '@jeditrader/geometry';
import { createBuffer } from './util.js';

const vertCode = `
	let p = pos(arg);
	return VertexOutput(camera.mvp * p, p.xy);
`;
const fragCode = `
	let uv = arg.uv;
	var dudv = vec2(
		length(vec2(dpdx(uv.x), dpdy(uv.x))),
		length(vec2(dpdx(uv.y), dpdy(uv.y)))
	);
	dudv *= axes.lineThickness;

	for (var i: u32 = 0; i < arrayLength(&horizontalLines); i++) {
		let xVal = horizontalLines[i];
		if (uv.y > -dudv.y + xVal && uv.y < dudv.y + xVal) {
			return axes.lineColor;
		}
	}
	for (var i: u32 = 0; i < arrayLength(&verticalLines); i++) {
		let yVal = verticalLines[i];
		if (uv.x > -dudv.x + yVal && uv.x < dudv.x + yVal) {
			return axes.lineColor;
		}
	}

	return axes.backgroundColor;
`;

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

	camera: Camera;
	uniform: GPUBuffer;
	horizontalLines: GPUBuffer;
	verticalLines: GPUBuffer;

	static getGeometry(range: Range<Vec3> = Axes.defaultRange) {
		const min = [range.min.x, range.min.y];
		const max = [range.max.x, range.max.y];

		// Use tiling approach.

		return [
			// cw from bottom left
			min[0], min[1],
			min[0], max[1],
			max[0], max[1],
			max[0], min[1],
		];
	}

	constructor(device: GPUDevice, camera: Camera) {
		const uniform = createBuffer({
			device,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
			data: new Float32Array([
				0.2, 0.2, 0.2, 1, // backgroundColor
				0, 0, 0, 1, // lineColor
				2, // lineThickness
			])
		});
		const horizontalLines = createBuffer({
			device,
			data: new Float32Array([0])
		});
		const verticalLines = createBuffer({
			device,
			data: new Float32Array([0])
		});

		super(
			device,
			camera,
			new Float32Array(Axes.getGeometry()),
			new Uint32Array([
				0, 1, 2,
				2, 3, 0,
			]),
			{
				vertexStride: 2,
				bindings: [
					new ShaderBinding({
						name: 'axes',
						type: 'uniform',
						buffer: uniform,
						visibility: GPUShaderStage.FRAGMENT,
						wgslStruct: `struct Axes {
	backgroundColor: vec4f,
	lineColor: vec4f,
	lineThickness: f32,
}`,
						wgslType: 'Axes',
					}),
					new ShaderBinding({
						name: 'horizontalLines',
						buffer: horizontalLines,
						visibility: GPUShaderStage.FRAGMENT,
					}),
					new ShaderBinding({
						name: 'verticalLines',
						buffer: verticalLines,
						visibility: GPUShaderStage.FRAGMENT,
					}),
				],
				depthWriteEnabled: false,
				cullMode: 'none',
				vertOutputFields: [ 'uv: vec2f' ],
				vertCode,
				fragCode,
			}
		);
		this.uniform = uniform;
		this.horizontalLines = horizontalLines;
		this.verticalLines = verticalLines;
		this.camera = camera;
	}

	setRange(range: Range<Vec3>) {
		const positions = new Float32Array(Axes.getGeometry(range));
		this.range = range;
		this.device.queue.writeBuffer(this.positions, 0, positions);
	}

	update() {
		const positions = new Float32Array(Axes.getGeometry(this.range));
		this.device.queue.writeBuffer(this.positions, 0, positions);
	}
}
