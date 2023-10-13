import { presentationFormat, sampleCount, depthFormat } from '../util.js';
import type { Binding as ShaderBinding, BindGroupLayouts } from '@jeditrader/shaders';

export interface MaterialOptions {
	depthWriteEnabled: boolean;
	cullMode: GPUCullMode;
	topology: GPUPrimitiveTopology;
};

export const defaultOptions: MaterialOptions = {
	depthWriteEnabled: true,
	cullMode: 'back',
	topology: 'triangle-list',
};

export type MaterialBinding = {
	resources: Binding['resources'];
	draw: Binding['draw'];
};

export type Binding = ShaderBinding & {
	obj: MaterialBinding;
};

export class Material {
	device: GPUDevice;
	pipeline: GPURenderPipeline;
	pipelineWireframe: GPURenderPipeline;

	bindGroupLayouts: BindGroupLayouts;
	bindings: Binding[] = [];

	name: string;
	wireframe = false;

	constructor(
		device: GPUDevice,
		name: string,
		vertCode: string,
		fragCode: string,
		bindGroupLayouts: BindGroupLayouts,
		options: Partial<MaterialOptions> = defaultOptions
	) {
		const opts = { ...defaultOptions, ...options };
		this.device = device;
		this.name = name;
		this.bindGroupLayouts = bindGroupLayouts;
		const layout = device.createPipelineLayout({
			label: name,
			bindGroupLayouts: Object.entries(bindGroupLayouts)
				.map(([groupName, group]) => device.createBindGroupLayout({
					label: groupName,
					entries: Object.values(group)
				}))
		});
		this.pipeline = this.createPipeline(device, vertCode, fragCode, opts, layout, false);
		this.pipelineWireframe = opts.topology === 'triangle-list'
			? this.createPipeline(device, vertCode, fragCode, opts, layout, true)
			: this.pipeline;
	}

	createPipeline(
		device: GPUDevice,
		vertCode: string,
		fragCode: string,
		opts: MaterialOptions,
		layout: GPUPipelineLayout,
		wireframe: boolean,
	): GPURenderPipeline {
		// @override can't be used for bind groups.
		Object.keys(this.bindGroupLayouts).forEach((groupName, i) => {
			vertCode = vertCode.replaceAll(`@group(${groupName})`, `@group(${i})`);
			fragCode = fragCode.replaceAll(`@group(${groupName})`, `@group(${i})`);
		});

		return device.createRenderPipeline({
			label: this.name,
			vertex: {
				module: device.createShaderModule({
					label: `${this.name} vertex shader`,
					code: vertCode,
				}),
				entryPoint: 'main',
				constants: {
					one: 1,
					wireframe: +wireframe,
				},
			},
			fragment: {
				module: device.createShaderModule({
					label: `${this.name} fragment shader`,
					code: fragCode,
				}),
				entryPoint: 'main',
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
							dstFactor: 'one-minus-src-alpha',
						}
					}
				}],
			},
			layout,
			depthStencil: {
				format: depthFormat,
				depthCompare: opts.depthWriteEnabled ? 'less' : 'always',
				depthWriteEnabled: opts.depthWriteEnabled,
			},
			primitive: {
				topology: wireframe ? 'line-list' : opts.topology,
				cullMode: opts.cullMode,
			},
			multisample: { count: sampleCount },
		});
	}

	bindResource(binding: MaterialBinding): Binding {
		const bindGroups = {} as Binding['bindGroups'];
		Object.entries(this.bindGroupLayouts)
			.forEach(([groupName, bindGroupLayout], i) => {
				if (groupName.startsWith('g_')) return;
				const entries = Object.entries(bindGroupLayout).map(([key, layoutEntry]) => {
					if (!(key in binding.resources))
						throw new Error(`expected resource "${key}" in resources when binding to material "${this.name}" (have keys ${Object.keys(binding.resources)})`);
					return {
						binding: layoutEntry.binding,
						resource: binding.resources[key as keyof Binding['resources']]
					} as GPUBindGroupEntry;
				});

				bindGroups[groupName] = this.device.createBindGroup({
					label: `material ${this.name} bind group ${i} (${groupName})`,
					layout: this.pipeline.getBindGroupLayout(i),
					entries,
				});
			});

		return {
			obj: binding,
			resources: binding.resources,
			bindGroups,
			draw: binding.draw.bind(binding),
		};
	}

	bind(...bindings: MaterialBinding[]) {
		this.bindings.push(...bindings.map(b => this.bindResource(b)));
	}

	unbind(...bindings: MaterialBinding[]) {
		this.bindings = this.bindings.filter(b => !bindings.includes(b.obj));
	}

	unbindAll() {
		this.bindings = [];
	}

	render(pass: GPURenderPassEncoder): void {
		pass.setPipeline(this.wireframe ? this.pipelineWireframe : this.pipeline);
		this.bindings.forEach(({ bindGroups, draw }) => {
			Object.keys(this.bindGroupLayouts)
				.forEach((groupName, i) => {
					if (!groupName.startsWith('g_')) {
						const b = bindGroups[groupName];
						pass.setBindGroup(i, b);
					}
				});
			draw(pass, this.wireframe);
		});
	}

	toggleWireframe() {
		this.wireframe = !this.wireframe;
	}
}
