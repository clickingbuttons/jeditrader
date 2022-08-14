#include "window.h"

#include "error.h"
#include <stdio.h>
#include <string.h>

void window_resize(Window* window, int width, int height) {
	printf("resize: %dx%d\n", width, height);
	window->width = width;
	window->height = height;
	window->aspect_ratio = (double)width / (double)height;
}

void window_init(Window* window, char* title) {
	window->width = 1920;
	window->height = 1080;
	window->aspect_ratio = (double)window->width / (double)window->height;
	int flags = SDL_WINDOW_VULKAN | SDL_WINDOW_SHOWN | SDL_WINDOW_ALLOW_HIGHDPI;
	window->window = SDL_CreateWindow(
	 title,
	 SDL_WINDOWPOS_UNDEFINED,
	 SDL_WINDOWPOS_UNDEFINED,
	 window->width,
	 window->height,
	 flags);
	CHECK_SDL(window->window == NULL);

	memset(window->keyboard_last, 0, sizeof(window->keyboard_last));
	memset(window->keyboard_cur, 0, sizeof(window->keyboard_cur));
	memset(window->mouse_last, 0, sizeof(window->mouse_last));
	memset(window->mouse_cur, 0, sizeof(window->mouse_cur));
}

void window_update(Window* window) {
	size_t num_keys = sizeof(window->keyboard_cur);
	memcpy(window->keyboard_last, window->keyboard_cur, num_keys);

	size_t num_mouse_buttons = sizeof(window->mouse_cur);
	memcpy(window->mouse_last, window->mouse_cur, num_mouse_buttons);
}

void window_event(Window* window, SDL_Event* e) {
	int key;
	switch (e->type) {
	case SDL_KEYDOWN:
		key = e->key.keysym.sym;
		if (key < sizeof(window->keyboard_cur)) {
			window->keyboard_cur[key] = 1;
		}
		break;
	case SDL_KEYUP:
		key = e->key.keysym.sym;
		if (key < sizeof(window->keyboard_cur)) {
			window->keyboard_cur[key] = 0;
		}
		break;
	case SDL_MOUSEBUTTONDOWN:
		key = e->button.button;
		if (key < sizeof(window->keyboard_cur)) {
			window->mouse_cur[key] = 1;
		}
		break;
	case SDL_MOUSEBUTTONUP:
		key = e->button.button;
		if (key < sizeof(window->keyboard_cur)) {
			window->mouse_cur[key] = 0;
		}
		break;
	case SDL_WINDOWEVENT_RESIZED:
	case SDL_WINDOWEVENT_SIZE_CHANGED:
		window_resize(window, e->window.data1, e->window.data2);
		break;
	case SDL_MOUSEMOTION:
		window->mouse_x = e->motion.x;
		window->mouse_y = e->motion.y;
		break;
	default:
		break;
	}
}
