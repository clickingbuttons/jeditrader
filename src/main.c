#include "cam.h"
#include "axes.h"
#include "cube.h"
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
	cam_default(&c, &window);
	register_axes_pipeline(&v, &c);
	register_cube_pipeline(&v, &c);

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
			else if (e.type == SDL_WINDOWEVENT) {
				switch (e.window.event) {
				case SDL_WINDOWEVENT_SIZE_CHANGED:
				case SDL_WINDOWEVENT_EXPOSED:
				case SDL_WINDOWEVENT_MINIMIZED:
				case SDL_WINDOWEVENT_MAXIMIZED:
				case SDL_WINDOWEVENT_RESTORED:
					resize(&v, window.window);
				}
			}
			else
				window_event(&window, &e);
		}

		// Update state
		cam_update(&c, &window, millis_diff);

		// Render
		if (SDL_GetWindowFlags(window.window) & SDL_WINDOW_MINIMIZED) {
			LOG("[%s] minimized\n", name);
		} else {
			draw(&v, window.window);
		}

		// Frame counter
		frame++;
		uint64_t millis = SDL_GetTicks64();
		millis_diff = millis - millis_start;
		millis_start = millis;
	}

	LOG("shutting down");
	// TODO: why does vkDestroy* hang for 5-10s on X11?!?!
	// destroy_vulkan(&v, window.window);
	SDL_DestroyWindow(window.window);
	SDL_Quit();

	return 0;
}
