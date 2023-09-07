import { BufferBinding, Mesh, SamplerBinding, TextureBinding } from './mesh.js';
import { Vec3 } from '@jeditrader/linalg';
import { createBuffer } from './util.js';

export interface Label {
	text: string;
	pos: Vec3;
}

const vertCode = `
	let p = pos(arg);
	let index = indices[arg.vertex];
	return VertexOutput(chart.viewProj * p.camRelative, uvs[index]);
`;
const fragCode = `return textureSample(quadTexture, quadSampler, arg.uv);`;
const indices = [
	0, 1, 2,
	2, 3, 0,
];

export class Labels extends Mesh {
	textures: GPUBuffer[] = [];

	constructor(device: GPUDevice, chart: GPUBuffer) {
		const source = new OffscreenCanvas(256, 256);
		const size = [source.width, source.height];
		const texture = device.createTexture({
			format: 'rgba8unorm',
			size,
			usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
		});

		const ctx = source.getContext('2d');
		if (ctx) {
			ctx.fillStyle = 'blue';
			ctx.fillRect(0, 0, source.width, source.height);
			ctx.fillStyle = 'black';
			ctx.fillRect(0, 0, source.width / 2, source.height / 2);
			ctx.fillStyle = 'red';
			ctx.fillRect(source.width / 2, source.height / 2, source.width / 2, source.height / 2);
			ctx.fillStyle = 'white';
			ctx.fillText('hello', source.width / 2, source.height / 2);
			device.queue.copyExternalImageToTexture({ source: source }, { texture }, size);
		}

		super(
			device,
			chart,
			[
				1041379200000, 25.87 * 2, 0,
				1704067200000 * 2, 25.87 * 2, 0,
				1704067200000 * 2, 1.01, 0,
				1041379200000, 1.01, 0,
			],
			indices,
			{
				bindings: [
					new BufferBinding(
						'uvs',
						createBuffer({
							device,
							data: new Float32Array([
								0, 0,
								0, 1,
								1, 1,
								1, 0,
							]),
						}),
						{
							wgslType: 'array<vec2f>',
						}
					),
					new SamplerBinding(
						'quadSampler',
						device.createSampler(),
					),
					new TextureBinding(
						'quadTexture',
						texture,
					),
				],
				depthWriteEnabled: false,
				cullMode: 'none',
				vertOutputFields: [ 'uv: vec2f' ],
				vertCode,
				fragCode,
			}
		);
	}

	setLabels(labels: Label[]) {

	}
}
