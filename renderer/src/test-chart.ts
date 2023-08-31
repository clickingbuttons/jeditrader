import { Camera } from './camera.js';
import { Input } from './input.js';
import { Mesh } from './mesh.js';
import { Axes } from './axes.js';
import { getNext } from './chart.js';
import { lods } from './lod.js';
import { Vec3 } from '@jeditrader/linalg';
import { Cube } from '@jeditrader/geometry';
import { unitsPerMs } from './chart.js';

export class Chart {
	input: Input;
	camera: Camera;
	axes: Axes;
	cubes: Mesh[];
	forceRender = false;
	lockLod = false;

	constructor(canvas: HTMLCanvasElement, device: GPUDevice) {
		this.input = new Input(canvas);
		this.camera = new Camera(canvas, device);
		this.axes = new Axes(device, this.camera);

		const origin = new Date(0);
		const millseconds: number[] = lods
			.map(({ name }) => getNext(origin, name).getTime())
			.concat(1e3, 1);
		this.cubes = millseconds.map(ms => {
			const radius = ms * unitsPerMs / 2;
			const cube = new Cube(new Vec3(0, 0, 0), new Vec3(radius, radius, radius));
			return Mesh.fromCSG(device, this.camera, cube);
		});
	}

	update(dt: DOMHighResTimeStamp): boolean {
		this.camera.update(dt, this.input);
		this.input.update();
		this.axes.update();

		const res = this.input.focused  || this.forceRender;
		this.forceRender = false;
		return res;
	}

	render(pass: GPURenderPassEncoder) {
		this.axes.render(pass);
		this.cubes.forEach(c => c.render(pass));
	}

	setTicker(ticker: string) {}

	toggleWireframe() {
		this.axes.toggleWireframe();
		this.cubes.forEach(c => c.toggleWireframe());
		this.forceRender = true;
	}
};
