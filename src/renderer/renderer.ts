import { mat4, vec3 } from 'wgpu-matrix';
import { Camera } from './camera';
import { Axes } from './axes';
import { OHLCV } from './ohlcv';
import { depthFormat, presentationFormat, sampleCount } from './util';
import { Input } from './input';
import { Provider, Aggregate, AggBounds } from '../providers/provider';
import { Lods } from './lod';
import { toymd, debounce } from '../helpers';

// We need the extra precision since there are ~630 billion milliseconds to potentially render.
mat4.setDefaultType(Float64Array);
vec3.setDefaultType(Float64Array);

export class Renderer {
	canvas: HTMLCanvasElement;
	device: GPUDevice;
	context: GPUCanvasContext;
	renderTarget: GPUTexture;
	renderTargetView: GPUTextureView;
	depthTexture: GPUTexture;
	depthTextureView: GPUTextureView;
	forceRender = true;
	lastTime = performance.now();

	provider: Provider;
	input: Input;
	camera: Camera;
	ohlcv: OHLCV;
	axes: Axes;
	lods = new Lods();

	private constructor(
		canvas: HTMLCanvasElement,
		device: GPUDevice,
		context: GPUCanvasContext,
		provider: Provider,
	) {
		this.canvas = canvas;
		this.device = device;
		this.context = context;
		this.renderTarget = this.createRenderTarget();
		this.renderTargetView = this.renderTarget.createView();
		this.depthTexture = this.createDepthTarget();
		this.depthTextureView = this.depthTexture.createView();
		this.provider = provider;
		this.input = new Input(canvas);
		this.camera = new Camera(canvas, this.device);
		this.ohlcv = new OHLCV(this.device, this.camera, this.lods);
		this.axes = new Axes(this.device, this.camera, this.lods);

		const observer = new ResizeObserver(debounce(this.onResize.bind(this)));
		observer.observe(canvas);
	}

	onResize(entries: ResizeObserverEntry[]) {
		console.log('onResize')
		const entry = entries[0];
		const canvas = entry.target as HTMLCanvasElement;
		const width = entry.contentBoxSize[0].inlineSize;
		const height = entry.contentBoxSize[0].blockSize;
		canvas.width = Math.max(1, Math.min(width, this.device.limits.maxTextureDimension2D));
		canvas.height = Math.max(1, Math.min(height, this.device.limits.maxTextureDimension2D));

		this.renderTarget.destroy();
		this.renderTarget = this.createRenderTarget();
		this.renderTargetView = this.renderTarget.createView();

		this.depthTexture.destroy();
		this.depthTexture = this.createDepthTarget();
		this.depthTextureView = this.depthTexture.createView();
	}

	onData(aggs: Aggregate[], lodName: string, aggBounds: AggBounds) {
		const lodIndex = this.lods.lods.findIndex(l => l.name === lodName);
		const lod = this.lods.lods[lodIndex];
		if (!lod) throw new Error('unknown lod ' + lodName);

		lod.aggs = aggs;
		lod.aggBounds = aggBounds;
		this.axes.update(true);
		this.ohlcv.update(true);
		this.forceRender = true;
	}

	setTicker(ticker: string) {
		const from = '1970-01-01';
		const to = toymd(new Date());

		// These are cheap to call. Network boundary is most of overhead.
		// TODO: make month + year aggs from daily aggs
		this.provider.year(ticker, from, to).then(({ aggs, bounds }) => {
			this.onData(aggs, 'year', bounds);
		});
		this.provider.month(ticker, from, to).then(({ aggs, bounds }) => {
			this.onData(aggs, 'month', bounds);
		});
		this.provider.week(ticker, from, to).then(({ aggs, bounds }) => {
			this.onData(aggs, 'week', bounds);
		});
		this.provider.day(ticker, from, to).then(({ aggs, bounds }) => {
			this.onData(aggs, 'day', bounds);
		});
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

		this.camera.update(dt, this.input);
		const newLod = this.lods.update(this.camera.eye[2]);
		this.axes.update(newLod);
		this.ohlcv.update(newLod);
		this.input.update();
		// Save CPU
		if (!this.input.focused && !this.forceRender) {
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
		this.axes.render(pass);
		this.ohlcv.render(pass);
		pass.end();
		this.device.queue.submit([commandEncoder.finish()]);

		this.forceRender = false;
		requestAnimationFrame(this.frame.bind(this));
	}

	render() {
		requestAnimationFrame(this.frame.bind(this));
	}

	static error(canvas: HTMLCanvasElement, msg: string) {
		canvas.innerText = msg;
		return new Error(msg);
	}

	static async init(canvas: HTMLCanvasElement, provider: Provider) {
		if (navigator.gpu === undefined)
			throw Renderer.error(canvas, 'WebGPU is not supported/enabled in your browser');

		var adapter = await navigator.gpu.requestAdapter();
		if (adapter === null) throw Renderer.error(canvas, 'No WebGPU adapter');
		var device = await adapter.requestDevice();
		var context = canvas.getContext('webgpu');
		if (context === null) throw Renderer.error(canvas, 'No WebGPU context');
		context.configure({ device, format: presentationFormat });

		return new Renderer(canvas, device, context, provider);
	}
};

