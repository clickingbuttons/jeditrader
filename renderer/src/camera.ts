import { Mat4, Vec3, Vec4, degToRad, clamp } from '@jeditrader/linalg';
import { Input } from './input.js';

declare let window: {
	zNear: number;
	zFar: number;
};

// https://carmencincotti.com/2022-05-02/homogeneous-coordinates-clip-space-ndc/#clip-space
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

	update(dt: DOMHighResTimeStamp, input: Input): number {
		if (input.buttons.mouse2) {
			this.yaw -= input.movementX / 1e3;
			this.pitch += input.movementY / 1e3;

			const epsilon = 0.1;
			this.pitch = clamp(this.pitch, -Math.PI / 2 + epsilon,  Math.PI / 2 - epsilon);
		}
		if (input.buttons.mouse1) console.log(this.eye, this.pitch, this.yaw);

		const absZ = Math.abs(this.eye.z);
		let cameraSpeed = dt * Math.max(absZ, 0.001) / 200;
		if (input.buttons.shift) cameraSpeed *= 8;
		else if (input.buttons.alt) cameraSpeed *= 4;

		const direction = this.direction();
		const aspectRatio = this.canvas.width / this.canvas.height;
		if (input.buttons.up) this.eye = this.eye.add(direction.mulScalar(cameraSpeed));
		if (input.buttons.down) this.eye = this.eye.sub(direction.mulScalar(cameraSpeed));
		if (input.buttons.left) this.eye = this.eye.sub(
				direction.cross(this.up).mulScalar(cameraSpeed * aspectRatio)
			);
		if (input.buttons.right) this.eye = this.eye.add(
				direction.cross(this.up).mulScalar(cameraSpeed * aspectRatio)
			);
		if (input.buttons.space) this.eye = this.eye.add(this.up.mulScalar(cameraSpeed));

		// TODO: proper change detection
		return +input.focused;
	}

	view(): Mat4 {
		const direction = this.direction();
		const target = this.eye.add(direction);
		const res = Mat4.lookAt(this.eye, target, this.up);

		return res;
	}

	proj(): Mat4 {
		const absZ = Math.abs(this.eye.z);
		const zNear = window.zNear || absZ / 32;
		const zFar = window.zFar || absZ * 1e3;
		return Mat4.perspective(
			degToRad(90),
			this.canvas.width / this.canvas.height,
			zNear,
			zFar,
		);
	}

	viewProj(): Mat4 {
		const view = this.view();
		// These can be numbers larger than f32 can handle precisely.
		// Instead we calculate relative to eye in the vertex shader.
		view[12] = 0;
		view[13] = 0;
		view[14] = 0;

		return this.proj().mul(view);
	}

	sceneToClip(pos: Vec3): Vec4 {
		const viewProj = this.proj().mul(this.view());
		const vec4 = new Vec4([pos.x, pos.y, pos.z, 1.0]);
		// divide X and Y by W just like the GPU does.
		let res = vec4.transform(viewProj);
// -0.7633553006212955
// 0.030136740506814252
// 259434475949.9285
// 267724939185.05508
// -2648.7129259527064
// 9.887604531161791
// -8553078387.68004
// -254240541.4804256
		res.x /= res.w;
		res.y /= res.w;

		return res;
	}
}
