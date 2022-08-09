#include "axes.h"
#include "cam.h"
#include "chart.h"
#include "cube.h"
#include "inttypes.h"
#include "linalg.h"
#include "platform.h"
#include "window.h"
#include <SDL2/SDL_events.h>

#define MAX_NUM_CHARTS 1024

#include <pthread.h>
#include <stdio.h>
#include <time.h>

void* run_chart(void* ptr) {
	char* name = ptr;
	printf("[%s] Making window\n", name);

	return NULL;
}

int main(int argc, char* argv[]) {
	if (SDL_Init(SDL_INIT_VIDEO) < 0) {
		fprintf(stderr, "video init failed: %s\n", SDL_GetError());
		return 1;
	}

	char* name = "SPY";
	Window window;
	if (window_init(&window, name))
		return 1;

	printf("[%s] Initializing objects\n", name);
	Chart chart;
	chart_init(&chart, window.width, window.height);
	window.chart = &chart;
	axes_init(&window, &window.chart->axes);
	cube_init(&window);

	chart_write(window.chart, 1);

	printf("[%s] Starting main loop\n", name);
	glEnable(GL_DEPTH_TEST);
	// glPolygonMode(GL_FRONT_AND_BACK, GL_LINE);

	u64 frame = 0;
	u64 nanos_start = get_nanotime();
	u64 nanos_diff = 0;
	bool should_close = 0;
	SDL_Event e;
	while (!should_close) {
		// Grab new input
		window_update(&window);
		while (SDL_PollEvent(&e) != 0) {
			if (e.type == SDL_QUIT) {
				should_close = 1;
			} else {
				window_event(&window, &e);
			}
		}

		glClearColor(0.2, 0.3, 0.3, 1.0);
		glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);

		// Update state with input
		axes_update(&window, &window.chart->axes);
		cam_update(&window.chart->cam, &window, nanos_diff);
		chart_update(window.chart);

		// Render
		if (!(SDL_GetWindowFlags(window.window) & SDL_WINDOW_MINIMIZED)) {
			axes_render_frame(&window, &window.chart->axes);
			cube_render_frame(&window, window.chart->num_cubes);
			SDL_GL_SwapWindow(window.window);
		} else {
			printf("[%s] minimized\n", name);
		}

		frame += 1;
		u64 nanotime = get_nanotime();
		nanos_diff = nanotime - nanos_start;
		nanos_start = nanotime;
	}

	SDL_DestroyWindow(window.window);

	printf("Terminating\n");
	SDL_Quit();
	return 0;
}
