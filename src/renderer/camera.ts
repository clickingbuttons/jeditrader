import { mat4, vec3, utils } from 'wgpu-matrix';
import { Input } from './input';

interface CameraGPU {
	device: GPUDevice;
	buffer: GPUBuffer;
	bindGroupLayout: GPUBindGroupLayout;
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
	eye = vec3.create(131, -110, 180);
	up = vec3.create(0, 0, 1);
	pitch = -1;
	yaw = 0.003;

	canvas: HTMLCanvasElement; // For aspect ratio
	gpu: CameraGPU; // For convienence
	direction = vec3.create(); // Computed

	constructor(canvas: HTMLCanvasElement, device: GPUDevice) {
		this.canvas = canvas;
		const buffer = device.createBuffer({
			size: 16 * 4,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
		});
		const bindGroupLayout = device.createBindGroupLayout({
			label: 'camera bind group layout',
			entries: [
				{
					binding: 0,
					visibility: GPUShaderStage.VERTEX,
					buffer: { type: 'uniform' }
				}
			]
		});
		const bindGroup = device.createBindGroup({
			label: 'camera bind group',
			layout: bindGroupLayout,
			entries: [{
				binding: 0,
				resource: { buffer }
			}]
		});
		this.gpu = {
			device,
			buffer,
			bindGroupLayout,
			bindGroup,
			layout: device.createPipelineLayout({
				label: 'camera uniform pipeline layout',
				bindGroupLayouts: [bindGroupLayout]
			}),
		};
	}

	update(dt: DOMHighResTimeStamp, input: Input) {
		if (input.buttons.mouse2) {
			const mouseSpeed = dt / 4e3;
			const dx = input.posX - input.lastPosX;
			const dy = input.posY - input.lastPosY;
			this.pitch += mouseSpeed * dy;
			this.yaw -= mouseSpeed * dx;

			if (this.pitch > Math.PI / 2 - 0.1) {
		 		this.pitch = Math.PI / 2 - 0.1;
		 	} else if (this.pitch < 0.1 - Math.PI / 2) {
		 		this.pitch = 0.1 - Math.PI / 2;
		 	}
		}
		if (input.buttons.mouse1) {
			console.log(this.eye, this.pitch, this.yaw)
		}

		const absZ = Math.abs(this.eye[2]);
		let cameraSpeed = dt * absZ / 200;
		if (input.buttons.shift) cameraSpeed *= 8;
		else if (input.buttons.alt) cameraSpeed *= 4;
		if (input.buttons.up) {
			this.eye = vec3.add(this.eye, vec3.mulScalar(this.direction, cameraSpeed));
		}
		if (input.buttons.down) {
			this.eye = vec3.sub(this.eye, vec3.mulScalar(this.direction, cameraSpeed));
		}
		if (input.buttons.left) {
			this.eye = vec3.sub(this.eye, vec3.mulScalar(vec3.cross(this.direction, this.up), cameraSpeed * this.canvas.width / this.canvas.height));
		}
		if (input.buttons.right) {
			this.eye = vec3.add(this.eye, vec3.mulScalar(vec3.cross(this.direction, this.up), cameraSpeed * this.canvas.width / this.canvas.height));
		}
		if (input.buttons.space) {
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
		const zNear = absZ * 1e-2;
		const zFar = absZ * 1e2;
		const proj = mat4.perspective(
			utils.degToRad(90),
			this.canvas.width / this.canvas.height,
			Math.min(zNear, zFar),
			Math.max(zNear, zFar),
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
