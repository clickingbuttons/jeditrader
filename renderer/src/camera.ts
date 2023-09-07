import { Mat4, Vec3, degToRad } from '@jeditrader/linalg';
import { Input } from './input.js';

declare let window: {
	zNear: number;
	zFar: number;
};

export class Camera {
	eye = new Vec3([
		 1357504146000,
		 -34199906000,
		 265554258000,
	]);
	up = new Vec3([0, 0, 1]);
	pitch = -1.47;
	yaw = -0.002;
	canvas: HTMLCanvasElement; // For aspect ratio

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
	}

	direction(): Vec3 {
		return new Vec3([
			Math.sin(this.yaw) * Math.cos(this.pitch),
			Math.cos(this.yaw) * Math.cos(this.pitch),
			Math.sin(this.pitch)
		]).normalize();
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

		const direction = this.direction();
		if (input.buttons.up) this.eye = this.eye.add(direction.mulScalar(cameraSpeed));
		if (input.buttons.down) this.eye = this.eye.sub(direction.mulScalar(cameraSpeed));
		if (input.buttons.left) this.eye = this.eye.sub(
				direction.cross(this.up).mulScalar(cameraSpeed * this.canvas.width / this.canvas.height)
			);
		if (input.buttons.right) this.eye = this.eye.add(
				direction.cross(this.up).mulScalar(cameraSpeed * this.canvas.width / this.canvas.height)
			);
		if (input.buttons.space) this.eye = this.eye.add(this.up.mulScalar(cameraSpeed));
	}

	viewProj(): Mat4 {
		const absZ = Math.abs(this.eye.z);
		const direction = this.direction();
		const target = this.eye.add(direction);
		const view = Mat4.lookAt(this.eye, target, this.up);
		// These can be numbers larger than f32 can handle.
		// Instead we calculate relative to eye in the vertex shader.
		view[12] = 0;
		view[13] = 0;
		view[14] = 0;
		const zNear = window.zNear || absZ / 32;
		const zFar = window.zFar || absZ * 1e3;
		const proj = Mat4.perspective(
			degToRad(90),
			this.canvas.width / this.canvas.height,
			zNear,
			zFar,
		);
		return proj.mul(view);
	}
}
