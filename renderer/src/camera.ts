import { Mat4, Vec3, degToRad, clamp } from '@jeditrader/linalg';
import { Input } from './input.js';
import { signal, Signal, computed, batch } from '@preact/signals-core';

function direction(pitch: number, yaw: number): Vec3 {
	return new Vec3([
		Math.sin(yaw) * Math.cos(pitch),
		Math.cos(yaw) * Math.cos(pitch),
		Math.sin(pitch)
	]).normalize()
}

function zNear(eye: Vec3): number {
	return Math.abs(eye.z) / 32;
}

function zFar(eye: Vec3): number {
	return Math.abs(eye.z) * 1e3;
}

// https://carmencincotti.com/2022-05-02/homogeneous-coordinates-clip-space-ndc/#clip-space
export class Camera {
	eye = signal(new Vec3([
		7.5e11,
		-2.24e11,
		8.3e11,
	]));
	pitch = signal(-1.43);
	yaw = signal(-0.002);
	fov = signal(90);
	zNear = signal(zNear(this.eye.value));
	zFar = signal(zFar(this.eye.value));

	up = new Vec3([0, 0, 1]);
	direction: Signal<Vec3>;
	view: Signal<Mat4>;
	proj: Signal<Mat4>;

	aspectRatio: Signal<number>;
	settings;

	constructor(aspectRatio: Signal<number>) {
		this.aspectRatio = aspectRatio;

		this.eye.subscribe(eye => batch(() => {
			this.zNear.value = zNear(eye);
			this.zFar.value = zFar(eye);
		}));
		this.direction = computed(() => direction(this.pitch.value, this.yaw.value));
		this.view = computed(() => {
			const direction = this.direction.value;
			const eye = this.eye.value;
			const target = eye.add(direction);
			return Mat4.lookAt(eye, target, this.up);
		});
		this.proj = computed(() => {
			return Mat4.perspective(
				degToRad(this.fov.value / 2),
				aspectRatio.value,
				this.zNear.value,
				this.zFar.value,
			);
		});

		this.settings = {
			eye: this.eye,
			pitch: this.pitch,
			yaw: this.yaw,
			fov: this.fov,
			zNear: this.zNear,
			zFar: this.zFar,
		};
	}

	update(dt: DOMHighResTimeStamp, input: Input) {
		batch(() => {
			if (input.buttons.mouse2) {
				this.yaw.value -= input.movementX / 1e3;
				const epsilon = 0.1;
				this.pitch.value = clamp(
					this.pitch.value + input.movementY / 1e3,
					-Math.PI / 2 + epsilon,
					+Math.PI / 2 - epsilon
				);
			}

			const absZ = Math.abs(this.eye.value.z);
			let cameraSpeed = dt * Math.max(absZ, 0.001) / 200;
			if (input.buttons.shift) cameraSpeed *= 2;

			let newEye = this.eye.value.clone();
			const direction = this.direction.value;
			const aspectRatio = this.aspectRatio.value;
			if (input.buttons.up) newEye = newEye.add(direction.mulScalar(cameraSpeed));
			if (input.buttons.down) newEye = newEye.sub(direction.mulScalar(cameraSpeed));
			if (input.buttons.left) newEye = newEye.sub(
					direction.cross(this.up).mulScalar(cameraSpeed * aspectRatio)
				);
			if (input.buttons.right) newEye = newEye.add(
					direction.cross(this.up).mulScalar(cameraSpeed * aspectRatio)
				);
			if (input.buttons.space) newEye = newEye.add(this.up.mulScalar(cameraSpeed));

			if (!newEye.eq(this.eye.value)) this.eye.value = newEye;
		});
	}
}
