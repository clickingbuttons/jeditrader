import { Camera } from './camera.js';
import { presentationFormat, sampleCount, createBuffer, depthFormat } from './util.js';

export class ShaderBinding {
	name: string;
	type: GPUBufferBindingType;
	visibility: GPUShaderStageFlags;
	buffer: GPUBuffer;
	vertStride: number;
	instanceStride: number;
	wgslType: string;
	wgslStruct: string;

	constructor({
		name,
		type = 'read-only-storage',
		visibility = GPUShaderStage.VERTEX,
		buffer,
		vertStride = 0,
		instanceStride = 0,
		wgslType = 'array<f32>',
		wgslStruct = '',
	} : {
		name: string,
		type?: GPUBufferBindingType,
		visibility?: GPUShaderStageFlags,
		buffer: GPUBuffer,
		vertStride?: number,
		instanceStride?: number,
		wgslType?: string,
		wgslStruct?: string,
	}) {
		this.name = name;
		this.type = type;
		this.visibility = visibility;
		this.buffer = buffer;
		this.vertStride = vertStride;
		this.instanceStride = instanceStride;
		this.wgslType = wgslType;
		this.wgslStruct = wgslStruct;
	}

	bindingType(): string {
		switch (this.type) {
		case 'uniform':
			return 'var<uniform>';
		case 'storage':
			return 'var<storage>';
		case 'read-only-storage':
			return 'var<storage, read>';
		default:
			throw new Error('unknown type ' + this.type);
		}
	}

	static positions(buffer: GPUBuffer, vertStride: number = 3, instanceStride: number = 0) {
		return new ShaderBinding({
			name: 'positions',
			buffer,
			vertStride,
			instanceStride,
		});
	}

	static indices(device: GPUDevice, indices: number[]) {
		return new ShaderBinding({
			name: 'indices',
			buffer: createBuffer({ device, data: new Uint32Array(indices) }),
			wgslType: 'array<u32>'
		});
	}

	static colors(buffer: GPUBuffer, vertStride: number = 3, instanceStride: number = 0) {
		return new ShaderBinding({
			name: 'colors',
			buffer,
			vertStride,
			instanceStride
		});
	}
}
// https://prideout.net/emulating-double-precision
// fn dsFun90(position: vec3f, positionLow: vec3f) -> vec3f {
// 	let t1 = positionLow - camera.eyeLow;
// 	let e = t1 - positionLow;
// 	let t2 = ((-camera.eyeLow - e) + (positionLow - (t1 - e))) + position - camera.eye;
// 	let high_delta = t1 + t2;
// 	let low_delta = t2 - (high_delta - t1);
// 	return high_delta + low_delta;
// }

// Because indexed triangle lists are the most efficient way to drive the GPU
// https://meshoptimizer.org/
export class Mesh {
	device: GPUDevice;
	pipeline: GPURenderPipeline;
	pipelineWireframe: GPURenderPipeline;

	bindGroup: GPUBindGroup;
	userBindGroup: GPUBindGroup;

	wireframe = true;
	nIndices = 0;
	nInstances = 1;

	static shaderCode(
		wireframe: boolean,
		bindings: ShaderBinding[],
		frag: string
	) {
		return `
// Mesh structs
struct Camera {
	mvp: mat4x4f,
	eye: vec3f,
	eyeLow: vec3f,
}
// Mesh bindings
@group(0) @binding(0) var<uniform> camera: Camera;
@group(0) @binding(1) var<storage, read> vertStrides: array<u32>;
@group(0) @binding(2) var<storage, read> instanceStrides: array<u32>;

// User structs
${bindings
	.filter(b => b.wgslStruct)
	.map(b => b.wgslStruct.trim())
	.join('\n			')
}

// User bindings
${bindings
	.map((b, i) => `@group(1) @binding(${i}) ${b.bindingType()} ${b.name}: ${b.wgslType};`)
	.join('\n			')
}

struct Vertex {
	@builtin(instance_index) instanceID: u32,
	@builtin(vertex_index) vertexID: u32,
}
struct VertexOutput {
	@builtin(position) position: vec4f,
	@location(0) color: vec4f,
	@location(1) uv: vec2f,
}

fn vertIndex(vertex: Vertex, binding: u32) -> u32 {
	var vertIndex = indices[vertex.vertexID];
	${wireframe ? `
	let triangleIndex = vertex.vertexID / 6u;
	let localVertexIndex = vertex.vertexID % 6u;

	let localToElement = array<u32, 6>(0u, 1u, 1u, 2u, 2u, 0u);
	let vertIndexIndex = 3u * triangleIndex + localToElement[localVertexIndex];

	vertIndex = indices[vertIndexIndex];
	` : ''}

	return vertex.instanceID * instanceStrides[binding] + vertStrides[binding] * vertIndex;
}

fn pos(vertex: Vertex) -> vec4f {
	let index = vertIndex(vertex, 0);

	var res = vec4f(0.0, 0.0, 0.0, 1.0);
	for (var i: u32 = 0; i < vertStrides[0]; i += 1) {
		res[i] = positions[index + i];
	}

	return res;
}

fn color(vertex: Vertex) -> vec4f {
	let index = vertIndex(vertex, 2);

	var res = vec4f(
		colors[index + 0],
		colors[index + 1],
		colors[index + 2],
		1.0
	);

	return res;
}

fn uv(vertex: Vertex, position: vec4f) -> vec2f {
	return position.xy;
}

@vertex fn vertMain(vertex: Vertex) -> VertexOutput {
	let position = pos(vertex);
	return VertexOutput(
		camera.mvp * position,
		color(vertex),
		uv(vertex, position)
	);
}

@fragment fn fragMain(in: VertexOutput) -> @location(0) vec4f {
	${frag}
}`;
	}

	static createPipeline(
		device: GPUDevice,
		layout: GPUPipelineLayout,
		bindings: ShaderBinding[],
		depthWriteEnabled: boolean,
		frag: string,
		wireframe: boolean,
	): GPURenderPipeline {
		const code = Mesh.shaderCode(wireframe, bindings, frag);
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
				depthWriteEnabled,
				depthCompare: 'less',
				format: depthFormat,
			},
			primitive: {
				topology: wireframe ? 'line-list' : 'triangle-list',
				cullMode: 'none',
			},
			multisample: { count: sampleCount },
		});
	}

	constructor(
		device: GPUDevice,
		camera: Camera,
		positions: ShaderBinding,
		indices: ShaderBinding,
		colors: ShaderBinding,
		customBindings: ShaderBinding[] = [],
		depthWriteEnabled: boolean = true,
		fragShader: string  = `return in.color;`
	) {
		this.device = device;
		this.nIndices = indices.buffer.size / 4;
		const bindings = [positions, indices, colors, ...customBindings];
		const layout = device.createPipelineLayout({
			bindGroupLayouts: [
				device.createBindGroupLayout({
					entries: ([
						'uniform', 'read-only-storage', 'read-only-storage'
					] as GPUBufferBindingType[]).map((type, i) => (
						{
							binding: i,
							visibility: GPUShaderStage.VERTEX,
							buffer: { type }
						}
					))
				}),
				device.createBindGroupLayout({
					entries: bindings.map(({ visibility, type, name }, i) => (
						{
							label: name,
							binding: i,
							visibility,
							buffer: { type }
						}
					))
				})
			],
		});
		this.pipeline = Mesh.createPipeline(
			device,
			layout,
			bindings,
			depthWriteEnabled,
			fragShader,
			false,
		);
		this.pipelineWireframe = Mesh.createPipeline(
			device,
			layout,
			bindings,
			depthWriteEnabled,
			fragShader,
			true,
		);

		this.bindGroup = device.createBindGroup({
			layout: this.pipeline.getBindGroupLayout(0),
			entries: [
					camera.gpu.buffer,
					createBuffer({
						device,
						data: new Uint32Array(bindings.map(b => b.vertStride))
					}),
					createBuffer({
						device,
						data: new Uint32Array(bindings.map(b => b.instanceStride))
					})
				].map((buffer, i) => ({ binding: i, resource: { buffer } }))
		});
		this.userBindGroup = device.createBindGroup({
			layout: this.pipeline.getBindGroupLayout(1),
			entries: bindings.map((binding, i) => (
				{
					binding: i,
					resource: {
						buffer: binding.buffer
					}
				}
			))
		});
	}

	toggleWireframe() {
		this.wireframe = !this.wireframe;
	}

	render(pass: GPURenderPassEncoder): void {
		if (this.nInstances <= 0) return;
		pass.setPipeline(this.wireframe ? this.pipelineWireframe : this.pipeline);
		pass.setBindGroup(0, this.bindGroup);
		pass.setBindGroup(1, this.userBindGroup);

		pass.draw(this.wireframe ? this.nIndices * 2 : this.nIndices, this.nInstances);
	}
}
