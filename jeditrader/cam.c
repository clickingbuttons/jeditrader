#include "cam.h"
#include "inttypes.h"

void cam_default(Cam* cam) {
	cam->eye = Vec3(-8.837565, -0.14128147, -12.928104);
	cam->direction = Vec3(0.0017142299, -0.3728435, -0.9278927);
	cam->up = Vec3(0, 0, 1);
	cam->pitch = -1.1887205;
	cam->yaw = -9.429376;
}

void cam_update(Cam* cam, Window* window, double loop_time) {
	bool mouse2_down_check = window->mouse_cur[SDL_BUTTON_RIGHT];

	if (window->keyboard_cur[SDLK_r] && !window->keyboard_last[SDLK_r]) {
		cam_default(cam);
	}

	float cameraSpeed = (double)loop_time / 200000000;
	if (window->keyboard_cur[SDLK_w]) {
		if (mouse2_down_check) {
			cam->eye =
			 vec3_sub(cam->eye, vec3_multf(cam->direction, cameraSpeed));
		} else {
			cam->eye =
			 vec3_sub(cam->eye, vec3_multf(cam->direction, cameraSpeed));
		}
	}
	if (window->keyboard_cur[SDLK_s]) {
		cam->eye = vec3_add(cam->eye, vec3_multf(cam->direction, cameraSpeed));
	}
	if (window->keyboard_cur[SDLK_a]) {
		cam->eye = vec3_sub(
		 cam->eye,
		 vec3_multf(
		  cross(cam->direction, cam->up),
		  cameraSpeed * window->chart->aspect_ratio));
	}
	if (window->keyboard_cur[SDLK_d]) {
		cam->eye = vec3_add(
		 cam->eye,
		 vec3_multf(
		  cross(cam->direction, cam->up),
		  cameraSpeed * window->chart->aspect_ratio));
	}
	if (window->keyboard_cur[SDLK_SPACE]) {
		cam->eye = vec3_sub(cam->eye, vec3_multf(cam->up, cameraSpeed));
	}

	double dx = window->mouse_x - cam->last_x;
	double dy = window->mouse_y - cam->last_y;
	cam->last_x = window->mouse_x;
	cam->last_y = window->mouse_y;

	if (!cam->mouse2_down && mouse2_down_check) {
		cam->mouse2_down = true;
		cam->start_x = window->mouse_x;
		cam->start_y = window->mouse_y;
		SDL_SetRelativeMouseMode(SDL_TRUE);
		SDL_SetWindowGrab(window->window, SDL_TRUE);
		return;
	} else if (cam->mouse2_down && !mouse2_down_check) {
		cam->mouse2_down = false;
		SDL_SetRelativeMouseMode(SDL_FALSE);
		SDL_SetWindowGrab(window->window, SDL_FALSE);
		SDL_WarpMouseInWindow(window->window, cam->start_x, cam->start_y);
	}
	if (!cam->mouse2_down) {
		return;
	}

	float mouseSpeed = (double)loop_time / 4000000000;
	cam->pitch += (dy * mouseSpeed); // % (2*HMM_PI);
	cam->yaw += (dx * mouseSpeed);	 // % (2*HMM_PI);

	if (cam->pitch > PI / 2 - 0.1) {
		cam->pitch = PI / 2 - 0.1;
	} else if (cam->pitch < 0.1 - PI / 2) {
		cam->pitch = 0.1 - PI / 2;
	}

	cam->direction = vec3_norm(Vec3(
	 sinf(cam->yaw) * cosf(cam->pitch),
	 cosf(cam->yaw) * cosf(cam->pitch),
	 sinf(cam->pitch)));
}
