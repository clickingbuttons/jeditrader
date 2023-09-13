import { Mat4, Vec3, degToRad, clamp } from '@jeditrader/linalg';
import { Input } from './input.js';
import { signal, Signal, computed } from '@preact/signals-core';

function makeDirection(pitch: number, yaw: number): Vec3 {
	return new Vec3([
		Math.sin(yaw) * Math.cos(pitch),
		Math.cos(yaw) * Math.cos(pitch),
		Math.sin(pitch)
	]).normalize()
}

// https://carmencincotti.com/2022-05-02/homogeneous-coordinates-clip-space-ndc/#clip-space
export class Camera {
	eye = signal(new Vec3([
		1356734171487.6748,
		141025292903.74258,
		244990244869.45505,
	]));
	pitch = signal(-1.47);
	yaw = signal(-0.002);

	up = new Vec3([0, 0, 1]);
	direction: Signal<Vec3>;
	view: Signal<Mat4>;
	proj: Signal<Mat4>;

	aspectRatio: Signal<number>;

	constructor(aspectRatio: Signal<number>) {
		this.aspectRatio = aspectRatio;
		this.direction = computed(() => makeDirection(this.pitch.value, this.yaw.value));

		this.view = computed(() => {
			const direction = this.direction.value;
			const eye = this.eye.value;
			const target = eye.add(direction);
			const view = Mat4.lookAt(eye, target, this.up);

			return view;
		});
		this.proj = computed(() => {
			const absZ = Math.abs(this.eye.value.z);
			const zNear = absZ / 32;
			const zFar = absZ * 1e3;
			return Mat4.perspective(
				degToRad(90),
				aspectRatio.value,
				zNear,
				zFar,
			);
		});
	}

	update(dt: DOMHighResTimeStamp, input: Input) {
		if (input.buttons.mouse2) {
			this.yaw.value -= input.movementX / 1e3;
			const epsilon = 0.1;
			this.pitch.value = clamp(
				this.pitch.value + input.movementY / 1e3,
				-Math.PI / 2 + epsilon,
				+Math.PI / 2 - epsilon
			);
		}
		if (input.buttons.mouse1) console.log(this.eye.value, this.pitch.value, this.yaw.value);

		const absZ = Math.abs(this.eye.value.z);
		let cameraSpeed = dt * Math.max(absZ, 0.001) / 200;
		if (input.buttons.shift) cameraSpeed *= 8;
		else if (input.buttons.alt) cameraSpeed *= 4;

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
	}
}
