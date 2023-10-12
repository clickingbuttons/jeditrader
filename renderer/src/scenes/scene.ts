import { Vec3, Vec4, Mat4, Ray } from '@jeditrader/linalg';
import { Camera, Controller, FPSController  } from '../camera/index.js';
import { Input } from '../input.js';
import { createBuffer } from '../util.js';
import { effect, Signal, computed, signal } from '@preact/signals-core';
import { Renderer, RendererFlags } from '../renderer.js';
import { BasicMaterial, PhongMaterial } from '../materials/index.js';
import { basicVert } from '@jeditrader/shaders';
import { Mesh } from '../meshes/index.js';
import { Sphere } from '@jeditrader/geometry';

const maxLights = 100;
type Light = {
	color: Vec4;
	pos: Vec3;
};

export class Scene {
	width: Signal<number>;
	height: Signal<number>;
	aspectRatio: Signal<number>;
	canvasUI: HTMLCanvasElement;
	device: GPUDevice;
	flags: RendererFlags;

	input: Input;
	camera: Camera;
	cameraController: Controller;
	viewProjInv: Signal<Mat4>;

	// Global shader resources
	resources: {
		bindGroup: GPUBindGroup;
		view: GPUBuffer;
		light: GPUBuffer;
	};
	light: Signal<Light> = signal({
		color: new Vec4(1, 1, 1, 1),
		pos: new Vec3(0, 3, 0),
	});

	materials;
	settings;

	constructor(renderer: Renderer) {
		this.width = renderer.width;
		this.height = renderer.height;
		this.aspectRatio = computed(() => renderer.width.value / renderer.height.value);
		this.device = renderer.device;
		this.canvasUI = renderer.canvasUI;
		this.flags = renderer.flags;
		this.input = renderer.input;
		this.camera = new Camera(this.aspectRatio);
		this.cameraController = new FPSController(this.camera);
		this.viewProjInv = computed(() => this.camera.proj.value.mul(this.camera.view.value).inverse());
		this.settings = {
			camera: this.camera.settings,
			light: this.light,
			showLights: signal(false),
		};

		const view = createBuffer({
			device: this.device,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
			data: this.viewData(),
		});
		const lightPos = createBuffer({
			device: this.device,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
			data: this.viewData(),
		});
		const bindGroupLayout = basicVert.bindGroupLayouts['g_scene'];
		const layout = this.device.createBindGroupLayout({
			entries: Object.values(bindGroupLayout)
		});
		const bindGroup = this.device.createBindGroup({
			layout,
			entries: [
				{ binding: bindGroupLayout.view.binding, resource: { buffer: view } },
				{ binding: bindGroupLayout.lightPos.binding, resource: { buffer: lightPos } },
			],
		});
		this.resources = {
			view,
			light: lightPos,
			bindGroup,
		};

		this.materials = {
			default: new BasicMaterial(this.device),
			phong: new PhongMaterial(this.device),
		};
		this.flags.rerender = true;

		effect(() => {
			this.device.queue.writeBuffer(this.resources.view, 0, this.viewData());
			this.flags.rerender = true;
		});

		effect(() => {
			this.device.queue.writeBuffer(this.resources.light, 0, this.lightData());
			this.flags.rerender = true;
		});

		const lightMesh = Mesh.fromCSG(this.device, new Sphere({ radius: .25 }), {
			instances: {
				models: new Float64Array(16 * maxLights),
				colors: new Float32Array(4 * maxLights),
			}
		});
		this.materials.default.bind(lightMesh);
		effect(() => {
			const light = this.settings.light.value;
			const transform = Mat4.translate(light.pos);
			lightMesh.updateModels(transform);
			lightMesh.updateColors(new Float32Array(light.color));
			lightMesh.visible = this.settings.showLights.value;
			this.flags.rerender = true;
		});
	}

	viewData() {
		return new Float32Array([
			...this.camera.view.value,
			...this.camera.proj.value,
			...this.camera.eye.value, 0,
			...this.camera.eye.value.f32Low(), 0,
		]);
	}

	lightData() {
		return new Float32Array([
			...this.light.value.color,
			...this.light.value.pos,
		]);
	}

	render(pass: GPURenderPassEncoder) {
		pass.setBindGroup(0, this.resources.bindGroup);
		Object.values(this.materials).forEach(material => material.render(pass));
	}

	toggleWireframe() {
		Object.values(this.materials).forEach(material => material.toggleWireframe());
		this.flags.rerender = true;
	}

	sceneToClip(pos: Vec3, model: Mat4 = Mat4.identity()): Vec4 {
		let mvp = this.camera.proj.value
			.mul(this.camera.view.value)
			.mul(model);

		let res = new Vec4(pos).transform(mvp);
		// divide X and Y by W just like the GPU does
		res.x /= res.w;
		res.y /= res.w;

		return res;
	}

	update(dt: DOMHighResTimeStamp) {
		this.cameraController.update(dt, this.input);
		this.input.update();
	}

	destroy() {
		this.resources.view.destroy();
		this.resources.light.destroy();
		Object.values(this.materials).forEach(m => m.unbindAll());
	}

	rayCastNDC(x: number, y: number): Ray {
		let near = new Vec4(x, y, 0, 1).transform(this.viewProjInv.value);
		near = near.divScalar(near.w);
		let far = new Vec4(x, y, 1, 1).transform(this.viewProjInv.value);
		far = far.divScalar(far.w);

		return new Ray(near.xyz(), far.sub(near).xyz());
	}

	rayCast(x: number, y: number): Ray {
		// convert to Normalized Device Coordinates: ([-1, -1, 0], [1, 1, 1])
		// https://www.w3.org/TR/webgpu/#coordinate-systems
		return this.rayCastNDC(
			(x / this.width.value - .5) * 2,
			-(y / this.height.value - .5) * 2
		);
	}
}
