import { Vec3, Vec4, Mat4, Ray } from '@jeditrader/linalg';
import { Camera, Controller, FPSController, OrbitController  } from './camera/index.js';
import { Input } from './input.js';
import { createBuffer } from './util.js';
import { effect, Signal, computed } from '@preact/signals-core';
import { Renderer, RendererFlags } from './renderer.js';
import { BufferBinding } from './shader-binding.js';
import { Material } from './material.js';
import { Mesh } from './mesh.js';

export class Scene {
	width: Signal<number>;
	height: Signal<number>;
	aspectRatio: Signal<number>;
	canvasUI: HTMLCanvasElement;
	device: GPUDevice;
	flags: RendererFlags;

	input: Input;
	camera: Camera;
	cameraController: Controller;
	viewProjInv: Signal<Mat4>;

	bindGroup: GPUBindGroup;
	uniform: GPUBuffer;

	materials;
	settings;

	constructor(renderer: Renderer) {
		this.width = renderer.width;
		this.height = renderer.height;
		this.aspectRatio = computed(() => renderer.width.value / renderer.height.value);
		this.device = renderer.device;
		this.canvasUI = renderer.canvasUI;
		this.flags = renderer.flags;
		this.input = renderer.input;
		this.camera = new Camera(this.aspectRatio);
		this.cameraController = new FPSController(this.camera);
		this.viewProjInv = computed(() => this.camera.proj.value.mul(this.camera.view.value).inverse());
		this.settings = {
			camera: this.camera.settings,
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
			default: new Material(this.device, { bindings: Object.values(Mesh.bindGroup) }),
			noCull: new Material(this.device, {
				bindings: Object.values(Mesh.bindGroup),
				cullMode: 'none',
			}),
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
			view: mat4x4f,
			proj: mat4x4f,
			eye: vec4f,
			eyeLow: vec4f,
			one: f32,
		}`
	});
	uniformData() {
		return new Float32Array([
			...this.camera.view.value,
			...this.camera.proj.value,
			...this.camera.eye.value, 0,
			...this.camera.eye.value.f32Low(), 0,
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

	sceneToClip(pos: Vec3, model: Mat4 = Mat4.identity()): Vec4 {
		let mvp = this.camera.proj.value
			.mul(this.camera.view.value)
			.mul(model);

		let res = new Vec4(pos).transform(mvp);
		// divide X and Y by W just like the GPU does
		res.x /= res.w;
		res.y /= res.w;

		return res;
	}

	update(dt: DOMHighResTimeStamp) {
		this.cameraController.update(dt, this.input);
		this.input.update();
	}

	destroy() {
		this.uniform.destroy();
		Object.values(this.materials).forEach(m => m.destroy());
	}

	rayCastNDC(x: number, y: number): Ray {
		let near = new Vec4(x, y, 0, 1).transform(this.viewProjInv.value);
		near = near.divScalar(near.w);
		let far = new Vec4(x, y, 1, 1).transform(this.viewProjInv.value);
		far = far.divScalar(far.w);

		return new Ray(near.xyz(), far.sub(near).xyz());
	}

	rayCast(x: number, y: number): Ray {
		// convert to Normalized Device Coordinates: ([-1, -1, 0], [1, 1, 1])
		// https://www.w3.org/TR/webgpu/#coordinate-systems
		return this.rayCastNDC(
			(x / this.width.value - .5) * 2,
			-(y / this.height.value - .5) * 2
		);
	}
}
