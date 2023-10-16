import { Vec3, Vec4, Mat4, Ray, degToRad } from '@jeditrader/linalg';
import { Camera, Controller, FPSController  } from '../camera/index.js';
import { Input } from '../input.js';
import { createBuffer, Range } from '../util.js';
import { effect, Signal, computed, signal, batch } from '@preact/signals-core';
import { Renderer, RendererFlags } from '../renderer.js';
import { BasicMaterial, PhongMaterial, LineMaterial } from '../materials/index.js';
import { basicVert } from '@jeditrader/shaders';
import { Mesh } from '../meshes/index.js';
import { Sphere } from '@jeditrader/geometry';
import { Color } from '../color.js';

const maxLights = 100;
type Light = {
	color: Color;
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
		color: Color.white,
		pos: new Vec3(1, 1, 1),
	});

	normals = false;
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
			line: new LineMaterial(this.device),
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
				colors: new Uint8Array(4 * maxLights),
			}
		});
		this.materials.default.bind(lightMesh);
		effect(() => {
			const light = this.settings.light.value;
			const transform = Mat4.translate(light.pos);
			lightMesh.updateModels(transform);
			lightMesh.updateColors(light.color);
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
			1,
		]);
	}

	lightData() {
		const res = new Uint8Array(4 * 3 + 4);
		new Float32Array(res.buffer).set(this.light.value.pos);
		res.set(this.light.value.color, 4 * 3);
		return res;
	}

	render(pass: GPURenderPassEncoder) {
		pass.setBindGroup(0, this.resources.bindGroup);
		Object.values(this.materials).forEach(material => material.render(pass));
	}

	toggleWireframe() {
		Object.values(this.materials).forEach(material => material.toggleWireframe());
		this.flags.rerender = true;
	}

	toggleNormals() {
		this.normals = !this.normals;
		if (this.normals) {
			const lineBindings = this.materials.default.bindings
				.concat(this.materials.phong.bindings)
				.map(b => ({
					...b,
					draw(pass: GPURenderPassEncoder) {
						if (!(b.obj instanceof Mesh)) return;
						if (b.obj.nIndices === 0 || b.obj.nInstances === 0 || !b.obj.visible) return;
						pass.draw(b.obj.nIndices * 2, b.obj.nInstances);
					}
				}));
			this.materials.line.bind(...lineBindings);
		} else {
			this.materials.line.unbindAll();
		}

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

	fitInView(range: Range<Vec3>, model: Mat4 = Mat4.identity()) {
		// Center on sphere to make math easy.
		// https://stackoverflow.com/questions/2866350/move-camera-to-fit-3d-scene
		let center = new Vec4(range.max.add(range.min).divScalar(2));
		// Take longest dimension as radius.
		let dims = new Vec4(range.max.sub(range.min));

		// Move to axes space.
		center = center.transform(model);
		dims = dims.transform(model);
		const radius = Math.max(...dims) / 2;

		const eye = center.clone();
		eye.y *= 0.8;
		eye.z = radius / Math.tan(degToRad(this.camera.fov.value / 2));
		batch(() => {
			this.camera.eye.value = eye.xyz();
			this.camera.dir.value = center.sub(eye).xyz().normalize();
		});
	}
}
