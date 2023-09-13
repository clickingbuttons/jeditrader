import { Mat4, Vec3, Vec4 } from '@jeditrader/linalg';
import { Camera } from './camera.js';
import { Input } from './input.js';
import { createBuffer } from './util.js';
import { effect, signal, Signal } from '@preact/signals-core';
import { RendererFlags } from './renderer.js';

interface DebugRenderable {
	render(pass: GPURenderPassEncoder): void;
	toggleWireframe(): void;
}

export class Scene {
	device: GPUDevice;

	input: Input;
	camera: Camera;

	model = signal(Mat4.identity());
	uniform: GPUBuffer;
	nodes: (DebugRenderable | undefined)[] = [];

	constructor(
		aspectRatio: Signal<number>,
		canvasUI: HTMLCanvasElement,
		device: GPUDevice,
		flags: RendererFlags,
	) {
		this.device = device;
		this.input = new Input(canvasUI);
		this.camera = new Camera(aspectRatio);
		this.uniform = createBuffer({
			device,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
			data: this.uniformData(),
		});
		effect(() => {
			this.device.queue.writeBuffer(this.uniform, 0, this.uniformData());
			flags.rerender = true;
		});
	}

	uniformData() {
		const viewRel = this.camera.view.value.clone();
		// These can be numbers larger than f32 can handle precisely.
		// Instead we calculate relative to eye in the vertex shader.
		viewRel[12] = 0;
		viewRel[13] = 0;
		viewRel[14] = 0;

		return new Float32Array([
			...this.model.value,
			...viewRel,
			...this.camera.proj.value,
			...this.camera.eye.value, 0,
			...this.camera.eye.value.f32Low(), 0,
		]);
	}

	update(dt: DOMHighResTimeStamp) {
		this.camera.update(dt, this.input);
		this.input.update();
	}

	render(pass: GPURenderPassEncoder) {
		this.nodes.forEach(m => m?.render(pass));
	}

	toggleWireframe() {
		this.nodes.forEach(m => m?.toggleWireframe());
	}

	sceneToClip(pos: Vec3): Vec4 {
		const mvp = this.camera.proj.value.mul(this.camera.view.value).mul(this.model.value);
		let res = new Vec4([...pos, 1.0]).transform(mvp);
		// divide X and Y by W just like the GPU does
		res.x /= res.w;
		res.y /= res.w;

		return res;
	}
}
