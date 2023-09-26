import { presentationFormat, sampleCount, depthFormat } from './util.js';
import { ShaderBinding } from './shader-binding.js';
import { Scene } from './scene.js';
import { Mesh } from './mesh.js';
import { fp64 } from './shaders/fp64.js';

export interface MaterialOptions {
	bindings: ShaderBinding[];
	depthWriteEnabled: boolean;
	cullMode: GPUCullMode;
	vertOutputFields: string[];
	vertCode: string;
	fragCode: string;
}

type BindGroups = { [key: string] : ShaderBinding[] };

const defaultOptions: MaterialOptions = {
	bindings: [],
	depthWriteEnabled: true,
	cullMode: 'back',
	vertOutputFields: ['color: vec4f'],
	vertCode: 'return VertexOutput(position64(arg).proj, color(arg));',
	fragCode: 'return arg.color;',
};

function bindGroupCode(shaderBindings: ShaderBinding[], group: number, label: string): string {
	return `// ${label} bindings
${shaderBindings
	.map((b, j) => b.toString(group, j))
	.join('\n')}`
}

function shaderCode(
	wireframe: boolean,
	bindGroups: BindGroups,
	options: MaterialOptions,
): string {
		return `
${Object.entries(bindGroups)
	.map(([label, group], i) => bindGroupCode(group, i, label))
	.join('\n')
}

struct VertexInput {
	@builtin(instance_index) instance: u32,
	@builtin(vertex_index) vertex: u32,
}
struct VertexOutput {
	@builtin(position) position: vec4f,
	${options.vertOutputFields.map((s, i) => `@location(${i}) ${s},`).join('\n	')}
}

${fp64('scene.one')}

fn sceneModel64() -> array<f64, 16> {
	return array<f64, 16>(
		f64(scene.model[0][0], scene.modelLow[0][0]),
		f64(scene.model[0][1], scene.modelLow[0][1]),
		f64(scene.model[0][2], scene.modelLow[0][2]),
		f64(scene.model[0][3], scene.modelLow[0][3]),

		f64(scene.model[1][0], scene.modelLow[1][0]),
		f64(scene.model[1][1], scene.modelLow[1][1]),
		f64(scene.model[1][2], scene.modelLow[1][2]),
		f64(scene.model[1][3], scene.modelLow[1][3]),

		f64(scene.model[2][0], scene.modelLow[2][0]),
		f64(scene.model[2][1], scene.modelLow[2][1]),
		f64(scene.model[2][2], scene.modelLow[2][2]),
		f64(scene.model[2][3], scene.modelLow[2][3]),

		f64(scene.model[3][0], scene.modelLow[3][0]),
		f64(scene.model[3][1], scene.modelLow[3][1]),
		f64(scene.model[3][2], scene.modelLow[3][2]),
		f64(scene.model[3][3], scene.modelLow[3][3]),
	);
}

fn model64(arg: VertexInput) -> array<f64, 16> {
	var modelIndex = 0u;
	if (arg.instance < arrayLength(&models)) {
		modelIndex = arg.instance;
	}

	return models[modelIndex];
}

struct Position {
	model: array<f64, 4>,
	scene: array<f64, 4>,
	view: vec4f,
	proj: vec4f,
}

fn position64(arg: VertexInput) -> Position {
	var vertIndex = indices[arg.vertex];
	${wireframe ? `
	let triangleIndex = arg.vertex / 6u;
	let localVertexIndex = arg.vertex % 6u;

	let localToElement = array<u32, 6>(0u, 1u, 1u, 2u, 2u, 0u);
	let vertIndexIndex = 3u * triangleIndex + localToElement[localVertexIndex];

	vertIndex = indices[vertIndexIndex];
	` : ''}

	let index = arg.instance * strides.instance + vertIndex * strides.vertex;

	var pos = array<f64, 4>(
		f64(0.0, 0.0),
		f64(0.0, 0.0),
		f64(0.0, 0.0),
		f64(1.0, 0.0)
	);
	for (var i: u32 = 0; i < min(3u, strides.vertex); i += 1) {
		pos[i] = positions[index + i];
	}

	var res = Position();

	res.model = mat4_vec4_mul64(model64(arg), pos);
	res.scene = mat4_vec4_mul64(sceneModel64(), res.model);
	res.view = scene.view * toVec4(res.scene);
	res.proj = scene.proj * res.view;

	return res;
}

fn color(arg: VertexInput) -> vec4f {
	var colorIndex = 0u;
	if (arg.instance < arrayLength(&colors)) {
		colorIndex = arg.instance;
	}

	return colors[colorIndex];
}

@vertex fn vertMain(arg: VertexInput) -> VertexOutput {
	${options.vertCode}
}

@fragment fn fragMain(arg: VertexOutput) -> @location(0) vec4f {
	${options.fragCode}
}`;
}

function createPipeline(
	device: GPUDevice,
	layout: GPUPipelineLayout,
	bindGroups: BindGroups,
	options: MaterialOptions,
	wireframe: boolean,
): GPURenderPipeline {
	const code = shaderCode(wireframe, bindGroups, options);
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

export class Material {
	device: GPUDevice;
	pipeline: GPURenderPipeline;
	pipelineWireframe: GPURenderPipeline;

	wireframe = false;

	bindGroups;
	meshes: {
		mesh: Mesh,
		bindGroup: GPUBindGroup,
	}[] = [];

	constructor(
		device: GPUDevice,
		options: Partial<MaterialOptions> = defaultOptions
	) {
		const opts = { ...defaultOptions, ...options };
		this.device = device;
		this.bindGroups = {
			scene: [Scene.uniform],
			...(opts.bindings.length === 0 ? {} : { user: opts.bindings })
		};
		const layout = device.createPipelineLayout({
			bindGroupLayouts: Object.entries(this.bindGroups).map(([label, group]) =>
				device.createBindGroupLayout({
					label,
					entries: group.map((b, i) => b.layoutEntry(i))
				})
			),
		});
		this.pipeline = createPipeline(device, layout, this.bindGroups, opts, false);
		this.pipelineWireframe = createPipeline(device, layout, this.bindGroups, opts, true);
	}

	bind(meshes: Mesh[]) {
		if (!this.bindGroups.user) return;
		this.meshes.push(...meshes.map(mesh => ({
			mesh,
			bindGroup: this.device.createBindGroup({
				layout: this.pipeline.getBindGroupLayout(1),
				entries: this.bindGroups.user!
					.map((binding, i) => {
						if (!(binding.name in mesh.buffers)) throw new Error(`expected ${binding.name} in mesh.buffers`);
						return binding.entry(i, mesh.buffers[binding.name as keyof typeof mesh.buffers]);
					})
			})
		})));
	}

	render(pass: GPURenderPassEncoder): void {
		pass.setPipeline(this.wireframe ? this.pipelineWireframe : this.pipeline);
		this.meshes.forEach(({ bindGroup, mesh }) => {
			if (mesh.nIndices === 0 || mesh.nInstances === 0) return;

			pass.setBindGroup(1, bindGroup);
			pass.draw(this.wireframe ? mesh.nIndices * 2 : mesh.nIndices, mesh.nInstances);
		});
	}

	toggleWireframe() {
		this.wireframe = !this.wireframe;
	}

	destroy() {
		Object.values(this.meshes).forEach(m => m.mesh.destroy());
		this.meshes = [];
	}
}
