#include "error.h"
#include "vulkan.h"
#include "window.h"

#include <libgen.h>

int main(int argc, char* argv[]) {
	CHECK_SDL(SDL_Init(SDL_INIT_VIDEO));
	
	char* name = "SPY";
	Window window;
	window_init(&window, name);
	Vulkan v = create_vulkan(window.window, dirname(argv[0]));

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

		// Render
		if (SDL_GetWindowFlags(window.window) & SDL_WINDOW_MINIMIZED) {
			LOG("[%s] minimized\n", name);
		} else {
			draw(&v);
		}

		// Frame counter
		frame++;
	}

	destroy_vulkan(&v, window.window);
	SDL_DestroyWindow(window.window);
	SDL_Quit();

	return 0;
}
