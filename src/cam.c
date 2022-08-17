#include "cam.h"
#include "inttypes.h"

static void cam_calc(Cam* c, Window* window) {
	c->view = look_at(c->eye, c->direction, c->up);
	c->proj = perspective_project(45, window->aspect_ratio, c->z_near, c->z_far);
}

void cam_default(Cam* c, Window* window) {
	c->eye = Vec3(-8.837565, -0.14128147, -12.928104);
	c->direction = Vec3(0.0017142299, -0.3728435, -0.9278927);
	c->up = Vec3(0, 0, 1);
	c->pitch = -1.1887205;
	c->yaw = -9.429376;
	c->z_near = 0.01;
	c->z_far = 100;
	cam_calc(c, window);
}

void cam_update(Cam* c, Window* window, double loop_time) {
	bool mouse2_down_check = window->mouse_cur[SDL_BUTTON_RIGHT];

	if (window->keyboard_cur[SDLK_r] && !window->keyboard_last[SDLK_r]) {
		cam_default(c, window);
	}

	float cameraSpeed = (double)loop_time / 200;
	if (window->keyboard_cur[SDLK_w]) {
		if (mouse2_down_check) {
			c->eye = vec3_sub(c->eye, vec3_multf(c->direction, cameraSpeed));
		} else {
			c->eye = vec3_sub(c->eye, vec3_multf(c->direction, cameraSpeed));
		}
	}
	if (window->keyboard_cur[SDLK_s]) {
		c->eye = vec3_add(c->eye, vec3_multf(c->direction, cameraSpeed));
	}
	if (window->keyboard_cur[SDLK_a]) {
		c->eye = vec3_sub(
		 c->eye,
		 vec3_multf(
		  cross(c->direction, c->up),
		  cameraSpeed * window->aspect_ratio));
	}
	if (window->keyboard_cur[SDLK_d]) {
		c->eye = vec3_add(
		 c->eye,
		 vec3_multf(
		  cross(c->direction, c->up),
		  cameraSpeed * window->aspect_ratio));
	}
	if (window->keyboard_cur[SDLK_SPACE]) {
		c->eye = vec3_sub(c->eye, vec3_multf(c->up, cameraSpeed));
	}

	double dx = window->mouse_x - c->last_x;
	double dy = window->mouse_y - c->last_y;
	c->last_x = window->mouse_x;
	c->last_y = window->mouse_y;

	if (!c->mouse2_down && mouse2_down_check) {
		c->mouse2_down = true;
		c->start_x = window->mouse_x;
		c->start_y = window->mouse_y;
		SDL_SetRelativeMouseMode(SDL_TRUE);
		SDL_SetWindowGrab(window->window, SDL_TRUE);
		return;
	} else if (c->mouse2_down && !mouse2_down_check) {
		c->mouse2_down = false;
		SDL_SetRelativeMouseMode(SDL_FALSE);
		SDL_SetWindowGrab(window->window, SDL_FALSE);
		SDL_WarpMouseInWindow(window->window, c->start_x, c->start_y);
	}
	if (!c->mouse2_down) {
		return;
	}

	float mouseSpeed = (double)loop_time / 4000;
	c->pitch += (dy * mouseSpeed); // % (2*HMM_PI);
	c->yaw += (dx * mouseSpeed);	 // % (2*HMM_PI);

	if (c->pitch > PI / 2 - 0.1) {
		c->pitch = PI / 2 - 0.1;
	} else if (c->pitch < 0.1 - PI / 2) {
		c->pitch = 0.1 - PI / 2;
	}

	c->direction = vec3_norm(Vec3(
	 sinf(c->yaw) * cosf(c->pitch),
	 cosf(c->yaw) * cosf(c->pitch),
	 sinf(c->pitch)));

	cam_calc(c, window);
}
