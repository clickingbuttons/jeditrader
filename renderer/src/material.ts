import { ShaderBinding, BufferBinding } from './shader-binding.js';
import { Scene } from './scene.js';
import { presentationFormat, sampleCount, depthFormat } from './util.js';
import { Mesh } from './mesh.js';

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
	vertOutputFields: [],
	vertCode: 'return VertexOutput(scene.proj * scene.view * pos(arg));',
	fragCode: 'return vec4f(1.0, 1.0, 0.0, 1.0);',
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

// Emulated double precision subtraction ported from dssub() in DSFUN90.
// https://www.davidhbailey.com/dhbsoftware/
// https://en.wikipedia.org/wiki/Kahan_summation_algorithm
// https://prideout.net/emulating-double-precision
fn subCamPos64(position: vec3f, positionLow: vec3f) -> vec3f {
	let t1 = positionLow - scene.eyeLow;
	let e = t1 - positionLow;
	let t2 = ((-scene.eyeLow - e) + (positionLow - (t1 - e))) + position - scene.eye;
	let highDifference = t1 + t2;
	let lowDifference = t2 - (highDifference - t1);
	return highDifference + lowDifference;
}

fn pos(arg: VertexInput) -> vec4f {
	var vertIndex = indices[arg.vertex];
	${wireframe ? `
	let triangleIndex = arg.vertex / 6u;
	let localVertexIndex = arg.vertex % 6u;

	let localToElement = array<u32, 6>(0u, 1u, 1u, 2u, 2u, 0u);
	let vertIndexIndex = 3u * triangleIndex + localToElement[localVertexIndex];

	vertIndex = indices[vertIndexIndex];
	` : ''}

	let index = arg.instance * strides.instance + vertIndex * strides.vertex;

	var pos = vec3f(0.0);
	var posLow = vec3f(0.0);
	for (var i: u32 = 0; i < min(3u, strides.vertex); i += 1) {
		pos[i] = positions[index + i];
		posLow[i] = positionsLow[index + i];
	}

	return vec4f(subCamPos64(pos, posLow), 1.0);
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
			scene: [Scene.Uniform],
			mesh: Mesh.bindGroups,
			// user: opts.bindings
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
		this.meshes.push(...meshes.map(mesh => ({
			mesh,
			bindGroup: this.device.createBindGroup({
				layout: this.pipeline.getBindGroupLayout(1),
				entries: Mesh.bindGroups.map((group, i) => {
					group.buffer = mesh[group.name as 'positions' | 'positionsLow' | 'indices'];
					return group.entry(i);
				}),
			})
		})));
	}

	render(pass: GPURenderPassEncoder): void {
		pass.setPipeline(this.wireframe ? this.pipelineWireframe : this.pipeline);
		this.meshes.forEach(({ bindGroup, mesh }) => {
			console.log('render mesh', mesh)
			pass.setBindGroup(1, bindGroup);

			const nIndices = mesh.indices.size / Float32Array.BYTES_PER_ELEMENT;
			pass.draw(this.wireframe ? nIndices * 2 : nIndices, mesh.nInstances);
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
