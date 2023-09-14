import { presentationFormat, sampleCount, depthFormat, createBuffer } from './util.js';
import { ShaderBinding, BufferBinding, SamplerBinding, TextureBinding } from './shader-binding.js';

export { BufferBinding, SamplerBinding, TextureBinding };

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
	vertCode: 'return VertexOutput(chart.proj * chart.view * pos(arg));',
	fragCode: 'return vec4f(1.0, 1.0, 0.0, 1.0);',
} as MeshOptions;

function f32Low(n: number) {
	return n - Math.fround(n);
}

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

	wireframe = false;
	nInstances = 1;
	visible = true;

	static shaderCode(
		wireframe: boolean,
		bindings: ShaderBinding[],
		options: MeshOptions,
	): string {
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

// Emulated double precision subtraction ported from dssub() in DSFUN90.
// https://www.davidhbailey.com/dhbsoftware/
// https://en.wikipedia.org/wiki/Kahan_summation_algorithm
// https://prideout.net/emulating-double-precision
fn subCamPos64(position: vec3f, positionLow: vec3f) -> vec3f {
	let t1 = positionLow - chart.eyeLow;
	let e = t1 - positionLow;
	let t2 = ((-chart.eyeLow - e) + (positionLow - (t1 - e))) + position - chart.eye;
	let highDifference = t1 + t2;
	let lowDifference = t2 - (highDifference - t1);
	return highDifference + lowDifference;
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
	for (var i: u32 = 0; i < ${Math.min(options.vertexStride, 3)}; i += 1) {
		pos[i] = positions[index + i];
		posLow[i] = positionsLow[index + i];
	}
	pos = (chart.model * vec4f(pos, 1.0)).xyz;
	posLow = (chart.model * vec4f(posLow, 1.0)).xyz;

	return vec4f(subCamPos64(pos, posLow), 1.0);
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
				depthCompare: options.depthWriteEnabled ? 'less' : 'always',
				depthWriteEnabled: options.depthWriteEnabled,
			},
			primitive: {
				topology: wireframe ? 'line-list' : 'triangle-list',
				cullMode: options.cullMode,
			},
			multisample: { count: sampleCount },
		});
	}

	constructor(
		device: GPUDevice,
		uniform: GPUBuffer,
		positions: number[],
		indices: number[],
		options: Partial<MeshOptions> = defaultOptions
	) {
		const opts = { ...defaultOptions, ...options };
		this.device = device;
		this.positions = createBuffer({ device, data: new Float32Array(positions) });
		this.positionsLow = createBuffer({ device, data: new Float32Array(positions.map(f32Low)) });
		this.indices = createBuffer({ device, data: new Uint32Array(indices) });

		const bindings = [
			new BufferBinding('chart', uniform, {
				type: 'uniform',
				visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
				wgslStruct: `struct Chart {
					model: mat4x4f,
					view: mat4x4f,
					proj: mat4x4f,
					eye: vec3f,
					eyeLow: vec3f,
				}`,
				wgslType: 'Chart',
			}),
			new BufferBinding('positions', this.positions),
			new BufferBinding('positionsLow', this.positionsLow),
			new BufferBinding('indices', this.indices, { wgslType: 'array<u32>' })
		] as ShaderBinding[];
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

	toggleWireframe() {
		this.wireframe = !this.wireframe;
	}

	render(pass: GPURenderPassEncoder): void {
		if (this.nInstances <= 0 || !this.visible) return;

		pass.setPipeline(this.wireframe ? this.pipelineWireframe : this.pipeline);
		this.bindGroups.forEach((b, i) => pass.setBindGroup(i, b));

		const nIndices = this.indices.size / 4;
		pass.draw(this.wireframe ? nIndices * 2 : nIndices, this.nInstances);
	}

	updatePositions(positions: number[], offset: number = 0) {
		this.device.queue.writeBuffer(this.positions, offset, new Float32Array(positions));
		this.device.queue.writeBuffer(this.positionsLow, offset, new Float32Array(positions.map(f32Low)));
	}

	destroy() {
		this.positions.destroy();
		this.positionsLow.destroy();
		this.indices.destroy();
	}
}
