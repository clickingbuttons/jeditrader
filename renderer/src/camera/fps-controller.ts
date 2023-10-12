import { Camera } from './camera.js';
import { Vec3, clamp } from '@jeditrader/linalg';
import { Input } from '../input.js';
import { signal, batch, Signal } from '@preact/signals-core';
import { Controller } from './controller.js';

export class FPSController implements Controller {
	cam: Camera;
	up = new Vec3(0, 1, 0);
	phi: Signal<number>;
	theta: Signal<number>;

	constructor(cam: Camera) {
		this.cam = cam;
		this.phi = signal(Math.PI + cam.dir.value.x);
		this.theta = signal(-cam.dir.value.y);
	}

	getDirection(): Vec3 {
		const phi = this.phi.value;
		const theta = this.theta.value;
		return new Vec3(
			Math.sin(phi),
			Math.sin(theta) * Math.cos(phi),
			Math.cos(theta) * Math.cos(phi),
		).normalize();
	}

	update(dt: DOMHighResTimeStamp, input: Input): void {
		let dirChange = false;
		if (input.buttons.mouse2) {
			this.phi.value += input.movementX / 1e3;
			const epsilon = 0.1;
			this.theta.value = clamp(
				this.theta.value - input.movementY / 1e3,
				-Math.PI / 2 + epsilon,
				+Math.PI / 2 - epsilon
			);
			dirChange = input.movementX !== 0 || input.movementY !== 0;
		}

		// Go faster the larger the z value
		const cam = this.cam;
		const absZ = Math.abs(cam.eye.value.z);
		let cameraSpeed = dt * Math.max(absZ, input.buttons.shift ? 8 : 1) / 200;
		if (input.buttons.shift) cameraSpeed *= 2;

		const up = cam.up.value;
		let newEye = cam.eye.value.clone();
		const newDir = this.getDirection();
		if (input.buttons.up) newEye = newEye.add(newDir.mulScalar(cameraSpeed));
		if (input.buttons.down) newEye = newEye.sub(newDir.mulScalar(cameraSpeed));
		if (input.buttons.left) newEye = newEye.sub(
				newDir.cross(up).mulScalar(cameraSpeed)
			);
		if (input.buttons.right) newEye = newEye.add(
				newDir.cross(up).mulScalar(cameraSpeed)
			);
		if (input.buttons.space) newEye = newEye.add(this.up.mulScalar(cameraSpeed));

		// Prevent needless rerenders
		batch(() => {
			if (!newEye.eq(cam.eye.value)) cam.eye.value = newEye;
			if (dirChange) cam.dir.value = newDir;
		});
	}
}
