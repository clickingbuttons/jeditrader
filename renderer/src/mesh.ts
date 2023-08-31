import { Camera } from './camera.js';
import { presentationFormat, sampleCount, depthFormat, createBuffer } from './util.js';
import { ShaderBinding } from './shader-binding.js';
import { CSG } from '@jeditrader/geometry';

export { ShaderBinding };

export interface MeshOptions {
	vertexStride: number;
	instanceStride: number;
	bindings: ShaderBinding[];
	depthWriteEnabled: boolean;
	cullMode: GPUCullMode;
	vertOutputFields: string[];
	vertCode: string;
	fragCode: string;
}
const defaultOptions = {
	vertexStride: 3,
	instanceStride: 0,
	bindings: [],
	depthWriteEnabled: true,
	cullMode: 'back',
	vertOutputFields: [],
	vertCode: 'return VertexOutput(camera.mvp * pos(arg));',
	fragCode: 'return vec4f(1.0, 1.0, 0.0, 1.0);',
} as MeshOptions;

// Because indexed triangle lists are the most efficient way to drive the GPU
// https://meshoptimizer.org/
export class Mesh {
	device: GPUDevice;

	positions: GPUBuffer;
	positionsLow: GPUBuffer;
	indices: GPUBuffer;

	bindGroups: GPUBindGroup[];
	pipeline: GPURenderPipeline;
	pipelineWireframe: GPURenderPipeline;

	wireframe = true;
	nInstances = 1;

	static shaderCode(
		wireframe: boolean,
		bindings: ShaderBinding[],
		options: MeshOptions,
	) {
		return `
// Mesh bindings
${bindings.map((b, i) => b.toString(0, i)).join('\n')}

// User bindings
${options.bindings.map((b, i) => b.toString(1, i)).join('\n')}

struct Vertex {
	@builtin(instance_index) instance: u32,
	@builtin(vertex_index) vertex: u32,
}
struct VertexOutput {
	@builtin(position) position: vec4f,
	${options.vertOutputFields.map((s, i) => `@location(${i}) ${s},`).join('\n	')}
}

// https://prideout.net/emulating-double-precision
fn dsFun90(position: vec3f, positionLow: vec3f) -> vec3f {
	let t1 = positionLow - camera.eyeLow;
	let e = t1 - positionLow;
	let t2 = ((-camera.eyeLow - e) + (positionLow - (t1 - e))) + position - camera.eye;
	let high_delta = t1 + t2;
	let low_delta = t2 - (high_delta - t1);
	return high_delta + low_delta;
}

fn pos(vertex: Vertex) -> vec4f {
	var vertIndex = indices[vertex.vertex];
	${wireframe ? `
	let triangleIndex = vertex.vertex / 6u;
	let localVertexIndex = vertex.vertex % 6u;

	let localToElement = array<u32, 6>(0u, 1u, 1u, 2u, 2u, 0u);
	let vertIndexIndex = 3u * triangleIndex + localToElement[localVertexIndex];

	vertIndex = indices[vertIndexIndex];
	` : ''}

	let index = vertex.instance * ${options.instanceStride} + vertIndex * ${options.vertexStride};

	var pos = vec3f(0.0);
	var posLow = vec3f(0.0);
	for (var i: u32 = 0; i < ${options.vertexStride}; i += 1) {
		pos[i] = positions[index + i];
		posLow[i] = positions[index + i];
	}

	return vec4f(dsFun90(pos, posLow), 1.0);
}

@vertex fn vertMain(arg: Vertex) -> VertexOutput {
	${options.vertCode}
}

@fragment fn fragMain(arg: VertexOutput) -> @location(0) vec4f {
	${options.fragCode}
}`;
	}

	static createPipeline(
		device: GPUDevice,
		layout: GPUPipelineLayout,
		bindings: ShaderBinding[],
		options: MeshOptions,
		wireframe: boolean,
	): GPURenderPipeline {
		const code = Mesh.shaderCode(wireframe, bindings, options);
		return device.createRenderPipeline({
			layout,
			vertex: {
				module: device.createShaderModule({ code }),
				entryPoint: 'vertMain',
			},
			fragment: {
				module: device.createShaderModule({ code }),
				entryPoint: 'fragMain',
				targets: [{
					format: presentationFormat,
					blend: {
						color: {
							operation: 'add',
							srcFactor: 'src-alpha',
							dstFactor: 'one-minus-src-alpha',
						},
						alpha: {
							operation: 'add',
							srcFactor: 'zero',
							dstFactor: 'one',
						}
					}
				}],
			},
			depthStencil: {
				format: depthFormat,
				depthCompare: options.depthWriteEnabled ? 'always' : 'less',
				depthWriteEnabled: options.depthWriteEnabled,
			},
			primitive: {
				topology: wireframe ? 'line-list' : 'triangle-list',
				cullMode: options.cullMode
			},
			multisample: { count: sampleCount },
		});
	}

	constructor(
		device: GPUDevice,
		camera: Camera,
		positions: Float64Array,
		indices: Uint32Array,
		options: Partial<MeshOptions> = defaultOptions
	) {
		const opts = { ...defaultOptions, ...options };
		this.device = device;
		this.positions = createBuffer({ device, data: new Float32Array(positions) });
		this.positionsLow = createBuffer({
			device,
			data: new Float32Array(positions.map(p => p - Math.fround(p)))
		});
		this.indices = createBuffer({ device, data: indices });

		const bindings = [
			new ShaderBinding({
				name: 'camera',
				type: 'uniform',
				wgslStruct: Camera.wgslStruct,
				wgslType: 'Camera',
				buffer: camera.gpu.buffer,
			}),
			new ShaderBinding({ name: 'positions', buffer: this.positions }),
			new ShaderBinding({ name: 'positionsLow', buffer: this.positions }),
			new ShaderBinding({ name: 'indices', buffer: this.indices, wgslType: 'array<u32>' })
		];
		const bindGroups = [bindings, opts.bindings];
		const layout = device.createPipelineLayout({
			bindGroupLayouts: bindGroups.map(group =>
				device.createBindGroupLayout({ entries: group.map((b, i) => b.layoutEntry(i)) })
			),
		});
		this.pipeline = Mesh.createPipeline(device, layout, bindings, opts, false);
		this.pipelineWireframe = Mesh.createPipeline(device, layout, bindings, opts, true);

		this.bindGroups = bindGroups.map((group, i) =>
			device.createBindGroup({
				layout: this.pipeline.getBindGroupLayout(i),
				entries: group.map((b, j) => b.entry(j)),
			})
		 );
	}

	static fromCSG(
		device: GPUDevice,
		camera: Camera,
		csg: CSG,
		options: Partial<MeshOptions> = defaultOptions
	): Mesh {
		const { positions, indices } = csg.toIndexedTriangles();

		return new Mesh(
			device,
			camera,
			new Float64Array(positions),
			new Uint32Array(indices),
			options
		);
	}

	toggleWireframe() {
		this.wireframe = !this.wireframe;
	}

	render(pass: GPURenderPassEncoder): void {
		if (this.nInstances <= 0) return;
		pass.setPipeline(this.wireframe ? this.pipelineWireframe : this.pipeline);
		this.bindGroups.forEach((b, i) => pass.setBindGroup(i, b));

		const nIndices = this.indices.size / 4;
		pass.draw(this.wireframe ? nIndices * 2 : nIndices, this.nInstances);
	}

	updatePositions(positions: number[]) {
		this.device.queue.writeBuffer(this.positions, 0, new Float32Array(positions));
		this.device.queue.writeBuffer(
			this.positionsLow,
			0,
			new Float32Array(positions.map(p => p - Math.fround(p)))
		);
	}
}