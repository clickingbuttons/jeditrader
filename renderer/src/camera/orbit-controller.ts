import { Camera } from './camera.js';
import { Vec3, clamp } from '@jeditrader/linalg';
import { Input } from '../input.js';
import { signal, batch, Signal } from '@preact/signals-core';
import { Controller } from './controller.js';

export class OrbitController implements Controller {
	cam: Camera;
	radius: number;
	phi: Signal<number>;
	theta: Signal<number>;

	constructor(cam: Camera) {
		this.cam = cam;
		this.radius = cam.eye.value.magnitude();
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
		if (input.buttons.camTilt) {
			this.phi.value -= input.movementX / 1e3;
			const epsilon = 0.3;
			this.theta.value = clamp(
				this.theta.value - input.movementY / 500,
				-Math.PI / 2 + epsilon,
				+Math.PI / 2 - epsilon
			);
			dirChange = input.movementX !== 0 || input.movementY !== 0;
		}

		let cameraSpeed = dt / 100;
		if (input.buttons.shift) cameraSpeed *= 2;

		if (input.buttons.up) this.radius -= cameraSpeed;
		if (input.buttons.down) this.radius += cameraSpeed;

		// Prevent needless rerenders
		batch(() => {
			const cam = this.cam;
			const newPos = this.getDirection().mulScalar(this.radius);
			if (!newPos.eq(cam.eye.value)) {
				cam.eye.value = newPos;
				cam.dir.value = cam.eye.value.mulScalar(-1).normalize();
			};
		});
	}
}
