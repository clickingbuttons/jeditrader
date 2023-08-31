import { depthFormat, presentationFormat, sampleCount } from './util.js';
import { Provider } from '@jeditrader/providers';
import { Chart } from './test-chart.js';
import { debounce } from './helpers.js';

export class Renderer {
	canvas: HTMLCanvasElement;
	device: GPUDevice;
	context: GPUCanvasContext;
	renderTarget: GPUTexture;
	renderTargetView: GPUTextureView;
	depthTexture: GPUTexture;
	depthTextureView: GPUTextureView;
	lastTime = performance.now();

	chart: Chart;

	private constructor(
		canvas: HTMLCanvasElement,
		device: GPUDevice,
		context: GPUCanvasContext,
		provider: Provider,
		ticker: string,
	) {
		this.canvas = canvas;
		this.device = device;
		this.context = context;
		this.renderTarget = this.createRenderTarget();
		this.renderTargetView = this.renderTarget.createView();
		this.depthTexture = this.createDepthTarget();
		this.depthTextureView = this.depthTexture.createView();

		this.chart = new Chart(canvas, this.device);

		const observer = new ResizeObserver(debounce(this.onResize.bind(this)));
		observer.observe(canvas);
	}

	onResize(entries: ResizeObserverEntry[]) {
		const entry = entries[0];
		const canvas = entry.target as HTMLCanvasElement;
		const width = entry.contentBoxSize[0].inlineSize;
		const height = entry.contentBoxSize[0].blockSize;
		console.log('resize', width, height)
		canvas.width = Math.max(1, Math.min(width, this.device.limits.maxTextureDimension2D));
		canvas.height = Math.max(1, Math.min(height, this.device.limits.maxTextureDimension2D));

		this.renderTarget.destroy();
		this.renderTarget = this.createRenderTarget();
		this.renderTargetView = this.renderTarget.createView();

		this.depthTexture.destroy();
		this.depthTexture = this.createDepthTarget();
		this.depthTextureView = this.depthTexture.createView();

		this.chart.forceRender = true;
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
		const dt = time - this.lastTime;
		this.lastTime = time;

		const needsRerender = this.chart.update(dt);
		// Save CPU
		if (!needsRerender) {
			requestAnimationFrame(this.frame.bind(this));
			return;
		}

		const commandEncoder = this.device.createCommandEncoder();
		const renderPassDescriptor: GPURenderPassDescriptor = {
			colorAttachments: [
				{
					view: this.renderTargetView,
					resolveTarget: this.context.getCurrentTexture().createView(),
					clearValue: { r: 135 / 255, g: 206 / 255, b: 235 / 255, a: 1.0 },
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
		this.chart.render(pass);
		pass.end();
		this.device.queue.submit([commandEncoder.finish()]);

		requestAnimationFrame(this.frame.bind(this));
	}

	render() {
		requestAnimationFrame(this.frame.bind(this));
	}

	static error(canvas: HTMLCanvasElement, msg: string) {
		canvas.innerText = msg;
		return new Error(msg);
	}

	static async init(canvas: HTMLCanvasElement, provider: Provider, ticker: string) {
		if (navigator.gpu === undefined)
			throw Renderer.error(canvas, 'WebGPU is not supported/enabled in your browser');

		var adapter = await navigator.gpu.requestAdapter();
		if (adapter === null) throw Renderer.error(canvas, 'No WebGPU adapter');
		var device = await adapter.requestDevice();
		var context = canvas.getContext('webgpu');
		if (context === null) throw Renderer.error(canvas, 'No WebGPU context');
		context.configure({ device, format: presentationFormat });

		return new Renderer(canvas, device, context, provider, ticker);
	}

	toggleWireframe() {
		this.chart.toggleWireframe();
	}

	toggleLodLock() {
		this.chart.lockLod = !this.chart.lockLod;
	}

	setTicker(ticker: string) {
		this.chart.setTicker(ticker);
	}
};
