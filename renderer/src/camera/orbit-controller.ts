import { Camera } from './camera.js';
import { Vec3, Mat4 } from '@jeditrader/linalg';
import { Input } from '../input.js';
import { signal, batch } from '@preact/signals-core';
import { Controller } from './controller.js';

export class OrbitController implements Controller {
	cam: Camera;
	center = new Vec3(0, 0, 0);
	xRot = 0;
	yRot = 0;

	constructor(cam: Camera) {
		this.cam = cam;
	}

	update(dt: DOMHighResTimeStamp, input: Input): void {
		let cameraSpeed = dt / 2e12;
		if (input.buttons.shift) cameraSpeed *= 2;

		const cam = this.cam;
		let newEye = cam.eye.value.clone();
		const radius = newEye.sub(this.center).magnitude();

		if (input.buttons.left) {
			const radSpeed = cameraSpeed;
			this.yRot += radSpeed;
			console.log(this.yRot);
			newEye = new Vec3(
				radius * Math.sin(this.xRot) * Math.cos(this.yRot),
				radius * Math.cos(this.xRot),
				radius * Math.sin(this.xRot) * Math.sin(this.yRot),
			);
		}
		// Prevent needless rerenders
		batch(() => {
			if (!newEye.eq(cam.eye.value)) {
				cam.eye.value = newEye;
				cam.dir.value = newEye.sub(this.center).normalize();
			};
		});
	}
}
