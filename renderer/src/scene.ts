import { Vec3, Vec4, Mat4 } from '@jeditrader/linalg';
import { Camera } from './camera.js';
import { Input } from './input.js';
import { createBuffer } from './util.js';
import { effect, Signal, signal, computed } from '@preact/signals-core';
import { Renderer, RendererFlags } from './renderer.js';
import { BufferBinding } from './shader-binding.js';
import { Material } from './material.js';
import { Mesh } from './mesh.js';

export interface Materials {
	'mesh': Material,
	[key: string]: Material,
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

	model: Signal<Mat4>;
	camModel: Signal<Mat4>;
	modelInv: Signal<Mat4>;
	settings;

	constructor(renderer: Renderer) {
		this.aspectRatio = renderer.aspectRatio;
		this.device = renderer.device;
		this.canvasUI = renderer.canvasUI;
		this.flags = renderer.flags;
		this.input = renderer.input;
		this.camera = new Camera(this.aspectRatio);
		this.model = signal(Mat4.identity());
		this.camModel = computed(() => Mat4
			.translate(this.camera.eye.value.mulScalar(-1))
			.mul(this.model.value)
		);
		this.modelInv = computed(() => this.model.value.inverse());
		this.settings = {
			camera: {
				eye: this.camera.eye,
				pitch: this.camera.pitch,
				yaw: this.camera.yaw,
			},
			model: this.model,
			modelInv: this.modelInv,
		};
		this.uniform = createBuffer({
			device: this.device,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
			data: this.uniformData(),
		});
		const binding = Scene.uniform;
		const layout = this.device.createBindGroupLayout({ entries: [binding.layoutEntry(0)] });
		this.bindGroup = this.device.createBindGroup({
			layout,
			entries: [binding.entry(0, this.uniform)],
		});
		this.materials = {
			'mesh': new Material(this.device, { bindings: Object.values(Mesh.bindGroup) })
		};
		this.flags.rerender = true;

		effect(() => {
			this.device.queue.writeBuffer(this.uniform, 0, this.uniformData());
			this.flags.rerender = true;
		});
	}

	static uniform = new BufferBinding('scene', {
		type: 'uniform',
		visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
		wgslStruct: `struct Scene {
			model: mat4x4f,
			modelLow: mat4x4f,
			view: mat4x4f,
			proj: mat4x4f,
			one: f32,
		}`
	});
	uniformData() {
		// Move camera translation from view to model.
		const viewRel = this.camera.view.value.clone();
		const model: Mat4 = this.camModel.value;
		viewRel[12] = 0;
		viewRel[13] = 0;
		viewRel[14] = 0;

		return new Float32Array([
			...model,
			...model.f32Low(),
			...viewRel,
			...this.camera.proj.value,
			1,
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
			.mul(this.model.value);

		let res = new Vec4([...pos, 1.0]).transform(mvp);
		// divide X and Y by W just like the GPU does
		res.x /= res.w;
		res.y /= res.w;

		return res;
	}

	update(dt: DOMHighResTimeStamp) {
		this.camera.update(dt, this.input);
		this.input.update();
	}

	destroy() {
		this.uniform.destroy();
		Object.values(this.materials).forEach(m => m.destroy());
	}
}
