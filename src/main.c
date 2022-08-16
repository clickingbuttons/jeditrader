#include "cam.h"
#include "error.h"
#include "vulkan.h"
#include "window.h"

#include <libgen.h>

int main(int argc, char* argv[]) {
	CHECK_SDL(SDL_Init(SDL_INIT_VIDEO | SDL_INIT_EVENTS));
	
	char* name = "SPY";
	Window window;
	window_init(&window, name);
	Vulkan v = create_vulkan(window.window, dirname(argv[0]));

	Cam c;
	cam_default(&c);
	//c.eye = Vec3(1, 1, 1);
	//c.direction = Vec3(0.0, 0.0, 0.0);
	//c.up = Vec3(0, 0, 1);
	//c.pitch = 0;
	//c.yaw = 0;

	uint64_t millis_start = SDL_GetTicks64();
	uint64_t millis_diff = 0;
	uint64_t frame = 0;
	bool should_close = 0;
	SDL_Event e;
	while (!should_close) {
		// Grab new input
		window_update(&window);
		while (SDL_PollEvent(&e) != 0) {
			if (e.type == SDL_QUIT)
				should_close = 1;
			else
				window_event(&window, &e);
		}

		// Update state
		cam_update(&c, &window, millis_diff);
		mat4 look = look_at(c.eye, c.direction, c.up);
		mat4 perspective = perspective_project(45, window.aspect_ratio, 0.1, 1000);
		mat4 mvp = mat4_mult(perspective, look);
		/*
		mvp = mat4d(1);
		mvp = (mat4) {
			.data = {
				{ -1, 0, 0, 0 },
				{  0, 1, 0, 0 },
				{  0, 0, 1.0002, 1 },
				{ 0.53, 0, 1.3, 1.32 },
			}
		};
		*/
		//mat4_print(mvp);

		// Render
		if (SDL_GetWindowFlags(window.window) & SDL_WINDOW_MINIMIZED) {
			LOG("[%s] minimized\n", name);
		} else {
			draw(&v, &mvp);
		}

		// Frame counter
		frame++;
		uint64_t millis = SDL_GetTicks64();
		millis_diff = millis - millis_start;
		millis_start = millis;
	}

	destroy_vulkan(&v, window.window);
	SDL_DestroyWindow(window.window);
	SDL_Quit();

	return 0;
}
