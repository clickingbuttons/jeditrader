import { Mat4, Vec3, degToRad } from '@jeditrader/linalg';
import { align } from './util.js';
import { Input } from './input.js';

interface CameraGPU {
	device: GPUDevice;
	buffer: GPUBuffer;
}

const wgslStruct = `struct Camera {
	mvp: mat4x4f,
	eye: vec3f,
	eyeLow: vec3f,
}`;

declare let window: {
	zNear: number;
	zFar: number;
};

export class Camera {
	static wgslStruct = wgslStruct;

	eye = new Vec3([
		 1357504146,
		 -34199906,
		 265554258,
	]);
	up = new Vec3([0, 0, 1]);
	pitch = -1.47;
	yaw = -0.002;
	canvas: HTMLCanvasElement; // For aspect ratio
	gpu: CameraGPU;
	direction = new Vec3([0, 0, 0]); // Computed

	constructor(canvas: HTMLCanvasElement, device: GPUDevice) {
		this.canvas = canvas;
		this.gpu = {
			device,
			buffer: device.createBuffer({
				size: align((4 * 4 + 6) * 4, 16),
				usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
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
		if (input.buttons.mouse1) console.log(this.eye, this.pitch, this.yaw);

		const absZ = Math.abs(this.eye.z);
		let cameraSpeed = dt * Math.max(absZ, 0.001) / 200;
		if (input.buttons.shift) cameraSpeed *= 8;
		else if (input.buttons.alt) cameraSpeed *= 4;
		if (input.buttons.up) {
			this.eye = this.eye.add(this.direction.mulScalar(cameraSpeed));
		}
		if (input.buttons.down) {
			this.eye = this.eye.sub(this.direction.mulScalar(cameraSpeed));
		}
		if (input.buttons.left) {
			this.eye = this.eye.sub(
				this.direction.cross(this.up).mulScalar(cameraSpeed * this.canvas.width / this.canvas.height)
			);
		}
		if (input.buttons.right) {
			this.eye = this.eye.add(
				this.direction.cross(this.up).mulScalar(cameraSpeed * this.canvas.width / this.canvas.height)
			);
		}
		if (input.buttons.space) {
			this.eye = this.eye.add(this.up.mulScalar(cameraSpeed));
		}

		this.direction = new Vec3([
			Math.sin(this.yaw) * Math.cos(this.pitch),
			Math.cos(this.yaw) * Math.cos(this.pitch),
			Math.sin(this.pitch)
		]).normalize();
		const target = this.eye.add(this.direction);
		const view = Mat4.lookAt(this.eye, target, this.up);
		view[12] = 0;
		view[13] = 0;
		view[14] = 0;
		const zNear = window.zNear || absZ / 32;
		const zFar = window.zFar || absZ * 1e3;
		if (input.buttons.mouse1) console.log('z', zNear, zFar);
		const proj = Mat4.perspective(
			degToRad(90),
			this.canvas.width / this.canvas.height,
			zNear,
			zFar,
		);
		const cameraBuffer = new Float32Array(this.gpu.buffer.size / Float32Array.BYTES_PER_ELEMENT);
		cameraBuffer.set(proj.mul(view).f32());
		cameraBuffer.set(this.eye.f32(), 16);
		cameraBuffer.set(this.eye.f32Low(), 20);

		this.gpu.device.queue.writeBuffer(this.gpu.buffer, 0, cameraBuffer);
	}
}
