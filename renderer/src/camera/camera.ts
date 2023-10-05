import { Mat4, Vec3, degToRad } from '@jeditrader/linalg';
import { signal, Signal, computed, batch } from '@preact/signals-core';

function zNear(eye: Vec3): number {
	return Math.abs(eye.z) / 32;
}

function zFar(eye: Vec3): number {
	return Math.abs(eye.z) * 1e3;
}

// https://carmencincotti.com/2022-05-02/homogeneous-coordinates-clip-space-ndc/#clip-space
export class Camera {
	up = signal(new Vec3(0, 1, 0));
	eye = signal(new Vec3(0, 0, 10));
	dir = signal(new Vec3(0, .1, -1).normalize());

	fov = signal(90);
	zNear = signal(zNear(this.eye.value));
	zFar = signal(zFar(this.eye.value));

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
		this.view = computed(() => Mat4.lookAt(
			this.eye.value,
			this.dir.value.mulScalar(-1),
			this.up.value
		));
		this.proj = computed(() => {
			return Mat4.perspective(
				degToRad(this.fov.value / 2),
				aspectRatio.value,
				this.zNear.value,
				this.zFar.value,
			);
		});

		this.settings = {
			up: this.up,
			eye: this.eye,
			dir: this.dir,
			fov: this.fov,
			zNear: this.zNear,
			zFar: this.zFar,
		};
	}
}
