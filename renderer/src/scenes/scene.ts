import { Vec3, Vec4, Mat4, Ray, degToRad } from '@jeditrader/linalg';
import { Camera, Controller, FPSController  } from '../camera/index.js';
import { Input } from '../input.js';
import { createBuffer } from '../util.js';
import { effect, Signal, computed, signal, batch } from '@preact/signals-core';
import { Renderer, RendererFlags } from '../renderer.js';
import { BasicMaterial, PhongMaterial, NormalsMaterial, LineMaterial } from '../materials/index.js';
import { phongFrag } from '@jeditrader/shaders';
import { Mesh } from '../meshes/index.js';
import { Sphere, Color, Range, Plane, Vertex } from '@jeditrader/geometry';

const maxLights = 100;
type Light = {
	pos: Vec3;
	color: Color;
};
const lightSize = 4 * (3 /* pos */ + 1 /* color (rgbaunorm ) */);

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
		lights: GPUBuffer;
	};
	lights: Signal<Light[]> = signal([{
		color: Color.white,
		pos: new Vec3(1, 1, 1),
	}]);

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
			lights: this.lights,
			showLights: signal(false),
		};

		const view = createBuffer({
			device: this.device,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
			data: this.viewData(),
		});
		const lights = createBuffer({ device: this.device, data: new Uint8Array(lightSize * maxLights), });
		const bindGroupLayout = phongFrag.bindGroupLayouts['g_scene'];
		const layout = this.device.createBindGroupLayout({
			entries: Object.values(bindGroupLayout)
		});
		const bindGroup = this.device.createBindGroup({
			layout,
			entries: [
				{ binding: bindGroupLayout.view.binding, resource: { buffer: view } },
				{ binding: bindGroupLayout.lights.binding, resource: { buffer: lights } },
			],
		});
		this.resources = {
			view,
			lights,
			bindGroup,
		};

		this.materials = {
			default: new BasicMaterial(this.device),
			phong: new PhongMaterial(this.device),
			// Debugging
			line: new LineMaterial(this.device),
			noCull: new BasicMaterial(this.device, { cullMode: 'none' }),
			normals: new NormalsMaterial(this.device),
		};
		this.flags.rerender = true;

		effect(() => {
			this.device.queue.writeBuffer(this.resources.view, 0, this.viewData());
			this.flags.rerender = true;
		});

		effect(() => {
			this.device.queue.writeBuffer(this.resources.lights, 0, this.lightData());
			this.flags.rerender = true;
		});

		const lightMesh = Mesh.fromCSG(this.device, new Sphere(), {
			instances: {
				models: new Float64Array(16 * maxLights),
				colors: new Uint8Array(4 * maxLights),
			}
		});
		this.materials.default.bind(lightMesh);
		this.settings.lights.subscribe(lights => {
			lights.forEach((light, i) => {
				const transform = Mat4.translate(light.pos).scale(new Vec3(10e9));
				lightMesh.updateModels(transform, i);
				lightMesh.updateInstanceColors(light.color, i);
			});
			lightMesh.nInstances = lights.length;
		});
		effect(() => {
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
			this.lights.value.length,
		]);
	}

	lightData() {
		const lights = this.lights.value;
		const res = new Uint8Array(lightSize * lights.length);
		lights.forEach((light, i) => {
			new Float32Array(res.buffer).set(light.pos, i * 4);
			res.set(light.color, i * lightSize + 3 * 4);
		});
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
			const lineBindings = Object.values(this.materials)
				.filter(m => m.topology === 'triangle-list')
				.map(m => m.bindings)
				.flat()
				.map(b => ({
					...b,
					draw(pass: GPURenderPassEncoder) {
						if (!(b.obj instanceof Mesh)) return;
						if (b.obj.nIndices === 0 || b.obj.nInstances === 0 || !b.obj.visible) return;
						pass.draw(b.obj.nIndices * 2, b.obj.nInstances);
					}
				}));
			this.materials.normals.bind(...lineBindings);
		} else {
			this.materials.normals.unbindAll();
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
		this.resources.lights.destroy();
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

	viewPlanes(): Plane[] {
		const viewBounds = [
			// [0, 0] is center
			[-1, -1], // bottom left
			[-1, 1], // top left
			[1, 1], // top right
			[1, -1] // bottom right
		];
		const rays = viewBounds.map(b => this.rayCastNDC(b[0], b[1]));
		const v = rays.map(r => ({
			near: new Vertex(r.point),
			far: new Vertex(r.point.add(r.dir)),
		}));
		// Useful for visual debugging
		// const csg = new CSG([
		// 	// near
		// 	new Polygon([v[0].near, v[1].near, v[2].near, v[3].near], new Color(255, 0, 0)),
		// 	// far
		// 	new Polygon([v[3].far , v[2].far , v[1].far , v[0].far ], new Color(255, 255, 0)),
		// 	// top
		// 	new Polygon([v[1].far , v[2].far , v[2].near, v[1].near], new Color(0, 255, 0)),
		// 	// bottom
		// 	new Polygon([v[0].near, v[3].near, v[3].far , v[0].far ], new Color(0, 255, 255)),
		// 	// left
		// 	new Polygon([v[1].far , v[1].near, v[0].near, v[0].far ], new Color(0, 0, 255)),
		// 	// right
		// 	new Polygon([v[2].near, v[2].far , v[3].far , v[3].near], new Color(255, 0, 255)),
		// ]);
		// Make normals easier to see
		// csg.polygons.forEach(p => p.vertices.forEach(v => v.normal = p.plane.normal.mulScalar(1e12)));
		// const edges = [
		// 	// TODO: proper edge dedup in Polygon. problem: { a, b } != { b, a }. custom comparison
		// 	// will be O(n^2), sorting not working
		// 	new Edge(v[0].near, v[1].near),
		// 	new Edge(v[1].near, v[2].near),
		// 	new Edge(v[2].near, v[3].near),
		// 	new Edge(v[3].near, v[0].near),

		// 	new Edge(v[0].far, v[1].far),
		// 	new Edge(v[1].far, v[2].far),
		// 	new Edge(v[2].far, v[3].far),
		// 	new Edge(v[3].far, v[0].far),

		// 	new Edge(v[0].near, v[0].far),
		// 	new Edge(v[1].near, v[1].far),
		// 	new Edge(v[2].near, v[2].far),
		// 	new Edge(v[3].near, v[3].far),
		// ];
		return [
			// near
			Plane.fromPoints(v[0].near, v[1].near, v[2].near),
			// far
			Plane.fromPoints(v[3].far , v[2].far , v[1].far ),
			// top
			Plane.fromPoints(v[1].far , v[2].far , v[2].near),
			// bottom
			Plane.fromPoints(v[0].near, v[3].near, v[3].far ),
			// left
			Plane.fromPoints(v[1].far , v[1].near, v[0].near),
			// right
			Plane.fromPoints(v[2].near, v[2].far , v[3].far ),
		];
	}
}
