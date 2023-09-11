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
// const fragCode = `return vec4f(1.0, 0.0, 0.0, 1.0);`;
const indices = [
	0, 1, 2,
	2, 3, 0,
];

interface AtlasPosition {
	x: number,
	y: number,
	width: number,
	height: number,
}
type AtlasPositions = { [key: string]: AtlasPosition };

// Yes, SDF or MSDF are better than an atlas.
// However they are significantly more complex and require computation to bake the textures.
function createAtlas() {
	const canvas = document.createElement('canvas');
	canvas.width = 512;
	canvas.height = 256;
	// for debugging
	canvas.style['background'] = 'black';
	document.body.appendChild(canvas);

	let ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('cannot get 2d context of offscreen canvas');

	const res = {
		canvas: ctx.canvas,
		atlas: {} as AtlasPositions,
	};

	const glyphWidth = 32;
	const glyphHeight = 40;

	let x = 0;
	let y = 0;
	ctx.font = `${glyphWidth}px monospace`;
	ctx.textBaseline = 'middle';
	ctx.textAlign = 'center';
	ctx.fillStyle = 'white';
	for (let i = 33; i < 128; i++) {
		const c = String.fromCodePoint(i);
		// For non-monospace
		// const glyphWidth = ctx.measureText(text).width;

		ctx.fillText(c, x + glyphWidth / 2, y + glyphHeight / 2);
		res.atlas[c] = { x, y, width: glyphWidth, height: glyphHeight };

		x += glyphWidth;
		if (x >= ctx.canvas.width) {
			x = 0;
			y += glyphHeight;
		}
	}

	return res;
}


export class Labels extends Mesh {
	textures: GPUBuffer[] = [];
	atlas: AtlasPositions;

	constructor(device: GPUDevice, chart: GPUBuffer) {
		const { canvas, atlas } = createAtlas();

		const size = [canvas.width, canvas.height];
		const texture = device.createTexture({
			format: 'rgba8unorm',
			size,
			usage:
				GPUTextureUsage.TEXTURE_BINDING |
				GPUTextureUsage.COPY_DST |
				GPUTextureUsage.RENDER_ATTACHMENT,
		});
		device.queue.copyExternalImageToTexture(
			{
				source: canvas,
				flipY: true
			},
			{ texture },
			size
		);

		super(
			device,
			chart,
			new Array(100 * 12),
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
		this.atlas = atlas;
	}

	glyphVertices(text: string, translation: Vec3): number[] {
		const res: number[] = [];
		for (let i = 0; i < text.length; i++) {
			const c = text[i];
			const pos = this.atlas[c];

			res.push(
				...translation,
				...translation.add(new Vec3([0, pos.height, 0])),
				...translation.add(new Vec3([pos.width * 1e9, pos.height, 0])),
				...translation.add(new Vec3([pos.width * 1e9, 0, 0])),
			);
		}

		return res;
	}

	setLabels(labels: Label[]) {
		const verts: number[] = [];

		labels.forEach(l => {
			for (let i = 0; i < l.text.length; i++) {
				const c = l.text[i];
				verts.push(...this.glyphVertices(c, l.pos));
			}
		});

		this.updatePositions(verts);
	}
}
