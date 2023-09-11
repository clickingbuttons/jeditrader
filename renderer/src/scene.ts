import { Mat4 } from '@jeditrader/linalg';
import { Camera } from './camera.js';
import { Input } from './input.js';
import { createBuffer } from './util.js';

interface DebugRenderable {
	render(pass: GPURenderPassEncoder): void;
	toggleWireframe(): void;
}

export class Scene {
	device: GPUDevice;

	input: Input;
	camera: Camera;

	model: Mat4;
	uniform: GPUBuffer;
	nodes: (DebugRenderable | undefined)[] = [];

	dirty: number = 1;

	constructor(
		canvas: HTMLCanvasElement,
		canvasUI: HTMLCanvasElement,
		device: GPUDevice,
		uniformLen: number = 4 * 4 * 4,
	) {
		this.device = device;
		this.input = new Input(canvasUI);
		this.camera = new Camera(canvas);
		this.model = Mat4.identity();
		this.uniform = createBuffer({
			device,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
			data: new Float32Array(uniformLen),
		});
	}

	uniformData() {
		return new Float32Array([
			...this.model,
			...this.camera.view(true),
			...this.camera.proj(),
			...this.camera.eye, 0,
			...this.camera.eye.f32Low(), 0,
		]);
	}

	update(dt: DOMHighResTimeStamp) {
		this.dirty |= this.camera.update(dt, this.input);
	}

	render(pass: GPURenderPassEncoder) {
		this.nodes.forEach(m => m?.render(pass));
	}

	toggleWireframe() {
		this.nodes.forEach(m => m?.toggleWireframe());
	}
}
