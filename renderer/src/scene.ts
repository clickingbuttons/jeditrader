import { Vec3, Vec4 } from '@jeditrader/linalg';
import { Camera } from './camera.js';
import { Input } from './input.js';
import { createBuffer } from './util.js';
import { effect, Signal } from '@preact/signals-core';
import { Renderer, RendererFlags } from './renderer.js';
import { BufferBinding } from './shader-binding.js';
import { Material } from './material.js';

export interface Materials {
	'default': Material,
}

export class Scene {
	aspectRatio: Signal<number>;
	canvasUI: HTMLCanvasElement;
	device: GPUDevice;
	flags: RendererFlags;

	input: Input;
	camera: Camera;

	bindGroup: GPUBindGroup;
	uniform: GPUBuffer;

	materials: Materials;

	// Type is { any: { nested: { objects: { value: Signal<any> } } } }
	settings: any;

	constructor(renderer: Renderer) {
		this.aspectRatio = renderer.aspectRatio;
		this.device = renderer.device;
		this.canvasUI = renderer.canvasUI;
		this.flags = renderer.flags;
		this.materials = {
			'default': new Material(this.device),
		};
		this.input = new Input(this.canvasUI);
		this.camera = new Camera(this.aspectRatio);
		this.uniform = createBuffer({
			device: this.device,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
			data: this.uniformData(),
		});
		const binding = Scene.Uniform.clone(this.uniform);
		const layout = this.device.createBindGroupLayout({ entries: [binding.layoutEntry(0)] });
		this.bindGroup = this.device.createBindGroup({
			layout,
			entries: [binding.entry(0)],
		});

		this.settings = {
			camera: {
				eye: this.camera.eye,
				pitch: this.camera.pitch,
				yaw: this.camera.yaw,
			},
		};

		effect(() => {
			this.device.queue.writeBuffer(this.uniform, 0, this.uniformData());
			this.flags.rerender = true;
		});
	}

	static Uniform = new BufferBinding('scene', null, {
		type: 'uniform',
		visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
		wgslStruct: `struct Scene {
			view: mat4x4f,
			proj: mat4x4f,
			eye: vec3f,
			eyeLow: vec3f,
			one: f32
		}`
	});
	uniformData() {
		const viewRel = this.camera.view.value.clone();
		// The eye translation can be numbers larger than f32 can handle precisely.
		// Instead we calculate relative to eye in the vertex shader.
		viewRel[12] = 0;
		viewRel[13] = 0;
		viewRel[14] = 0;

		return new Float32Array([
			...viewRel,
			...this.camera.proj.value,
			...this.camera.eye.value, 0,
			...this.camera.eye.value.f32Low(), 1
		]);
	}

	render(pass: GPURenderPassEncoder) {
		pass.setBindGroup(0, this.bindGroup);
		Object.values(this.materials).forEach(material => material.render(pass));
	}

	toggleWireframe() {
		Object.values(this.materials).forEach(material => material.toggleWireframe());
		this.flags.rerender = true;
	}

	sceneToClip(pos: Vec3): Vec4 {
		let mvp = this.camera.proj.value
			.mul(this.camera.view.value)
			// .mul(this.root.model);

		let res = new Vec4([...pos, 1.0]).transform(mvp);
		// divide X and Y by W just like the GPU does
		res.x /= res.w;
		res.y /= res.w;

		return res;
	}

	update(dt: DOMHighResTimeStamp) {
		this.camera.update(dt, this.input);
		// this.root.update(dt, this.input);
		this.input.update();
	}

	destroy() {
		this.uniform.destroy();
		Object.values(this.materials).forEach(m => m.destroy());
	}
}
