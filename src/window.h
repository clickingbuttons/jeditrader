#pragma once

#include "linalg.h"

#include <SDL2/SDL.h>
#include <SDL2/SDL_vulkan.h>

#define SDL_BUTTON_LAST 128
typedef struct SDL_Window SDL_Window;

typedef struct Window {
	SDL_Window* window;
	int width;
	int height;
	float aspect_ratio;
	char keyboard_last[SDL_NUM_SCANCODES];
	char keyboard_cur[SDL_NUM_SCANCODES];
	char mouse_last[SDL_BUTTON_LAST];
	char mouse_cur[SDL_BUTTON_LAST];
	int mouse_x;
	int mouse_y;
} Window;

void window_init(Window* window, char* title);

void window_update(Window* window);
void window_event(Window* window, SDL_Event* e);
