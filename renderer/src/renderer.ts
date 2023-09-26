import { depthFormat, presentationFormat, sampleCount } from './util.js';
import { Scene } from './scene.js';
import { debounce } from './helpers.js';
import { Signal, signal } from '@preact/signals-core';
import { TestScene } from './test-scene.js';

export interface RendererFlags {
	rerender: boolean;
}

function growCanvas(canvas: HTMLCanvasElement) {
	const { width, height } = canvas.getBoundingClientRect();
	canvas.width = width;
	canvas.height = height;
}

export function drawMessage(canvas: HTMLCanvasElement, msg: string, font = '64px sans') {
	const ctx = canvas.getContext('2d');
	if (!ctx) return;

	ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
	ctx.font = font;
	ctx.textBaseline = 'middle';
	ctx.textAlign = 'center';
	ctx.fillStyle = 'white';
	ctx.fillText(msg, ctx.canvas.width / 2, ctx.canvas.height / 2);
}

export class Renderer {
	canvas: HTMLCanvasElement;
	canvasUI: HTMLCanvasElement;
	device: GPUDevice;
	context: GPUCanvasContext;

	renderTarget: GPUTexture;
	renderTargetView: GPUTextureView;
	depthTexture: GPUTexture;
	depthTextureView: GPUTextureView;

	lastTime = performance.now();
	dt = signal(1);
	flags: RendererFlags = {
		rerender: true,
	};

	settings;

	aspectRatio: Signal<number>;
	scene: Scene;

	private constructor(
		canvas: HTMLCanvasElement,
		canvasUI: HTMLCanvasElement,
		device: GPUDevice,
		context: GPUCanvasContext,
	) {
		this.canvas = canvas;
		this.canvasUI = canvasUI;
		this.device = device;
		this.context = context;
		this.renderTarget = this.createRenderTarget();
		this.renderTargetView = this.renderTarget.createView();
		this.depthTexture = this.createDepthTarget();
		this.depthTextureView = this.depthTexture.createView();
		this.settings = {
			clearColor: signal({ r: 135 / 255, g: 206 / 255, b: 235 / 255, a: 1.0 }),
		};
		this.settings.clearColor.subscribe(() => this.flags.rerender = true);
		this.aspectRatio = signal(canvas.width / canvas.height);

		this.scene = new TestScene(this); // Init last

		new ResizeObserver(debounce(this.onResize.bind(this))).observe(canvasUI);
	}

	onResize() {
		growCanvas(this.canvas);
		growCanvas(this.canvasUI);
		this.renderTarget.destroy();
		this.renderTarget = this.createRenderTarget();
		this.renderTargetView = this.renderTarget.createView();

		this.depthTexture.destroy();
		this.depthTexture = this.createDepthTarget();
		this.depthTextureView = this.depthTexture.createView();

		this.aspectRatio.value = this.canvas.width / this.canvas.height;
	}

	createRenderTarget() {
		return this.device.createTexture({
			size: [this.canvas.width, this.canvas.height],
			sampleCount,
			format: presentationFormat,
			usage: GPUTextureUsage.RENDER_ATTACHMENT,
		})
	}

	createDepthTarget() {
		return this.device.createTexture({
			size: [this.canvas.width, this.canvas.height],
			sampleCount,
			format: depthFormat,
			usage: GPUTextureUsage.RENDER_ATTACHMENT,
		});
	}

	frame(time: DOMHighResTimeStamp): void {
		this.dt.value = time - this.lastTime;
		this.scene.update(this.dt.value);
		this.lastTime = time;

		if (!this.flags.rerender) { // Save GPU + CPU a lot of work
			requestAnimationFrame(this.frame.bind(this));
			return;
		}

		const commandEncoder = this.device.createCommandEncoder();
		const renderPassDescriptor: GPURenderPassDescriptor = {
			colorAttachments: [
				{
					view: this.renderTargetView,
					resolveTarget: this.context.getCurrentTexture().createView(),
					clearValue: this.settings.clearColor.value,
					loadOp: 'clear',
					storeOp: 'store',
				},
			],
			depthStencilAttachment: {
				view: this.depthTextureView,
				depthClearValue: 1.0,
				depthLoadOp: 'clear',
				depthStoreOp: 'store',
			},
		};

		const pass = commandEncoder.beginRenderPass(renderPassDescriptor);
		this.scene.render(pass);
		pass.end();

		this.device.queue.submit([commandEncoder.finish()]);
		this.flags.rerender = false;

		requestAnimationFrame(this.frame.bind(this));
	}

	run() {
		requestAnimationFrame(this.frame.bind(this));
	}

	static async init(canvas: HTMLCanvasElement, canvasUI: HTMLCanvasElement) {
		// Init takes a while. Let's show a nice loading screen...
		growCanvas(canvas);
		growCanvas(canvasUI);
		drawMessage(canvasUI, 'initializing renderer...');
		try {
			if (navigator.gpu === undefined)
				throw new Error('WebGPU is not supported by your browser');

			var adapter = await navigator.gpu.requestAdapter();
			if (adapter === null) throw new Error('No WebGPU adapter available');
			var device = await adapter.requestDevice();
			var context = canvas.getContext('webgpu');
			if (context === null) throw new Error('No WebGPU context available');
			context.configure({ device, format: presentationFormat });

			return new Renderer(canvas, canvasUI, device, context);
		} catch (error) {
			drawMessage(canvasUI, '' + error);
			throw error;
		}
	}
};

