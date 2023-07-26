import { Camera } from './camera';
import { OHLCV } from './ohlcv';
import { presentationFormat, sampleCount } from './util';
import { Input } from './input';

export async function render(canvas: HTMLCanvasElement) {
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
					clearValue: { r: 0.2, g: 0.2, b: 0.2, a: 1.0 },
					loadOp: 'clear',
					storeOp: 'store',
				},
			],
			depthStencilAttachment: {
				view: depthTextureView,
				depthClearValue: 1.0,
				depthLoadOp: 'clear',
				depthStoreOp: 'store',
			},
		};
		const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
		ohlcv.render(passEncoder);
		device.queue.submit([commandEncoder.finish()]);

		requestAnimationFrame(frame);
	}
	requestAnimationFrame(frame);
}
