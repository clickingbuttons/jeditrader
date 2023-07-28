import { mat4, vec3 } from 'wgpu-matrix';
import { Camera } from './camera';
import { Axes } from './axes';
import { OHLCV } from './ohlcv';
import { presentationFormat, sampleCount, Bounds } from './util';
import { Input } from './input';
import { Aggregate } from '../helpers';

// We need the extra precision since there are ~630 billion milliseconds to potentially render.
mat4.setDefaultType(Float64Array);
vec3.setDefaultType(Float64Array);

function getBounds(aggs: Aggregate[]): Bounds {
	const res: Bounds = {
		x: { min: Number.MAX_VALUE, max: Number.MIN_VALUE },
		y: { min: Number.MAX_VALUE, max: Number.MIN_VALUE },
		z: { min: Number.MAX_VALUE, max: Number.MIN_VALUE },
	};
	var agg;
	for (let i = 0; i < aggs.length; i++) {
		agg = aggs[i];
		if (agg.time < res.x.min) res.x.min = agg.time;
		if (agg.time > res.x.max) res.x.max = agg.time;
		if (agg.low < res.y.min) res.y.min = agg.low;
		if (agg.high > res.y.max) res.y.max = agg.high;
		if (agg.volume < res.z.min) res.z.min = agg.volume;
		if (agg.volume > res.z.max) res.z.max = agg.volume;
	}
	return res;
}

export class Renderer {
	ohlcv?: OHLCV;
	axes?: Axes;

	setAggs(aggs: Aggregate[]) {
		if (aggs.length === 0) return;
		if (!this.ohlcv || !this.axes) throw new Error('aggs fetched too fast')
		let bounds = getBounds(aggs);
		console.log('bounds', bounds);
		bounds = this.ohlcv.setAggs(aggs, bounds, 86400000);
		console.log('world bounds', bounds)
		this.axes.setBounds(bounds);
	}

	async render(canvas: HTMLCanvasElement) {
		if (navigator.gpu === undefined)
			throw new Error('WebGPU is not supported/enabled in your browser');

		var adapter = await navigator.gpu.requestAdapter();
		if (adapter === null) throw new Error('No WebGPU adapter');
		var device = await adapter.requestDevice();
		var context = canvas.getContext('webgpu');
		if (context === null) throw new Error('No WebGPU context');
		context.configure({ device, format: presentationFormat });

		const input = new Input(canvas);
		var camera = new Camera(canvas, device);

		const ohlcv = new OHLCV(device, camera);
		this.ohlcv = ohlcv;
		const axes = new Axes(device, camera);
		this.axes = axes;
		console.log('render');

		let renderTarget: GPUTexture | undefined = undefined;
		let renderTargetView: GPUTextureView;
		let depthTexture: GPUTexture | undefined = undefined;
		let depthTextureView: GPUTextureView;

		let lastTime = performance.now();
		function frame(time: DOMHighResTimeStamp) {
			const dt = time - lastTime;
			lastTime = time;
			const currentWidth = canvas.clientWidth * devicePixelRatio;
			const currentHeight = canvas.clientHeight * devicePixelRatio;

			if (
				currentWidth !== canvas.width ||
				currentHeight !== canvas.height ||
				renderTarget === undefined
			) {
				if (renderTarget !== undefined) renderTarget.destroy();

				canvas.width = currentWidth;
				canvas.height = currentHeight;

				renderTarget = device.createTexture({
					size: [canvas.width, canvas.height],
					sampleCount,
					format: presentationFormat,
					usage: GPUTextureUsage.RENDER_ATTACHMENT,
				});
				depthTexture = device.createTexture({
					size: [canvas.width, canvas.height],
					sampleCount,
					format: 'depth24plus',
					usage: GPUTextureUsage.RENDER_ATTACHMENT,
				});

				renderTargetView = renderTarget.createView();
				depthTextureView = depthTexture.createView();
			}

			camera.update(dt, input);
			input.update();

			const commandEncoder = device.createCommandEncoder();
			const renderPassDescriptor: GPURenderPassDescriptor = {
				colorAttachments: [
					{
						view: renderTargetView,
						resolveTarget: context?.getCurrentTexture().createView(),
						clearValue: { r: 135 / 255, g: 206 / 255, b: 235 / 255, a: 1.0 },
						loadOp: 'clear',
						storeOp: 'store',
					},
				],
				// depthStencilAttachment: {
				// 	view: depthTextureView,
				// 	depthClearValue: 1.0,
				// 	depthLoadOp: 'clear',
				// 	depthStoreOp: 'store',
				// },
			};
			const pass = commandEncoder.beginRenderPass(renderPassDescriptor);
			axes.render(pass);
			ohlcv.render(pass);
			pass.end();
			device.queue.submit([commandEncoder.finish()]);

			requestAnimationFrame(frame);
		}
		requestAnimationFrame(frame);
	}
};

