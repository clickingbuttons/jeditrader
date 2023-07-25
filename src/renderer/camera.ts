import { mat4, vec3, utils } from 'wgpu-matrix';
import { Input } from './input';

interface CameraGPU {
	device: GPUDevice;
	buffer: GPUBuffer;
	bindGroup: GPUBindGroup;
	layout: GPUPipelineLayout;
}

function mat4Print(mat4: mat4.default) {
	var s = '[\n';
	for (let i = 0; i < 4; i++) {
		for (let j = 0; j < 4; j++) {
			if (j === 0) s += '\t';
			s += mat4[i * 4 + j];
			s += ', ';
		}
		if (i !== 3) s += '\n';
	}
	s += '\n]';
	console.log(s);
}

export class Camera {
	eye: vec3.default;
	up: vec3.default;
	pitch: number;
	yaw: number;

	canvas: HTMLCanvasElement; // For aspect ratio
	gpu: CameraGPU; // For convienence

	// Computed
	direction: vec3.default;

	constructor(canvas: HTMLCanvasElement, device: GPUDevice) {
		this.eye = vec3.create(0, 0, -3);
		this.up = vec3.create(0, 0, 1);
		this.pitch = 0.9;
		this.yaw = 0.1;
		this.canvas = canvas;

		const buffer = device.createBuffer({
			size: 16 * 4,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
		});
		const bindGroupLayout = device.createBindGroupLayout({
			entries: [
				{
					binding: 0,
					visibility: GPUShaderStage.VERTEX,
					buffer: {
						type: "uniform"
					}
				}
			]
		});
		this.gpu = {
			device,
			buffer,
			bindGroup: device.createBindGroup({
				layout: bindGroupLayout,
				entries: [{
					binding: 0,
					resource: {
						buffer
					}
				}]
			}),
			layout: device.createPipelineLayout({bindGroupLayouts: [bindGroupLayout]}),
		};
		this.direction = vec3.create();
	}

	update(dt: DOMHighResTimeStamp, input: Input) {
		if (input.button[0]) {
			const mouseSpeed = dt / 4e3;
			const dx = input.pos.x - input.lastPos.x;
			const dy = input.pos.y - input.lastPos.y;
			this.pitch += mouseSpeed * dy;
			this.yaw -= mouseSpeed * dx;

			if (this.pitch > Math.PI / 2 - 0.1) {
		 		this.pitch = Math.PI / 2 - 0.1;
		 	} else if (this.pitch < 0.1 - Math.PI / 2) {
		 		this.pitch = 0.1 - Math.PI / 2;
		 	}
		}

		const cameraSpeed = dt / 100;
		if (input.up) {
			this.eye = vec3.add(this.eye, vec3.mulScalar(this.direction, cameraSpeed));
		}
		if (input.down) {
			this.eye = vec3.sub(this.eye, vec3.mulScalar(this.direction, cameraSpeed));
		}
		if (input.left) {
			this.eye = vec3.sub(this.eye, vec3.mulScalar(vec3.cross(this.direction, this.up), cameraSpeed * this.canvas.width / this.canvas.height));
		}
		if (input.right) {
			this.eye = vec3.add(this.eye, vec3.mulScalar(vec3.cross(this.direction, this.up), cameraSpeed * this.canvas.width / this.canvas.height));
		}
		if (input.space) {
			this.eye = vec3.add(this.eye, vec3.mulScalar(this.up, cameraSpeed));
		}

		vec3.normalize(
			vec3.create(
				Math.sin(this.yaw) * Math.cos(this.pitch),
				Math.cos(this.yaw) * Math.cos(this.pitch),
				Math.sin(this.pitch)
			),
			this.direction
		);
		const target = vec3.add(this.eye, this.direction);
		const view = mat4.lookAt(this.eye, target, this.up);
		const proj = mat4.perspective(
			utils.degToRad(45),
			this.canvas.width / this.canvas.height,
			1,
			100.0
		);
		const viewProj = mat4.multiply(proj, view);

		this.gpu.device.queue.writeBuffer(
			this.gpu.buffer,
			0,
			viewProj as Float32Array,
			0,
			16,
		);
	}
}
