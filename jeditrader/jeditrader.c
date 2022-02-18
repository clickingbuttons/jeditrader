#include "inttypes.h"
#include "linalg.h"
#include "axes.h"
#include "window.h"
#include "cam.h"
#include "chart.h"

#include <stdio.h>
#include <time.h>

void render_frame(Window* window) {
  axes_render_frame(window->chart->g_world);
}

void error_callback_glfw(int error, const char *description) {
  fprintf(stderr, "GLFW error: %s\n", description);
}

int main(int argc, char *argv[]) {
  printf("Starting %s\n", argv[0]);
  if (!glfwInit())
    return -1;

  printf("Registering error_callback_glfw\n");
  glfwSetErrorCallback(error_callback_glfw);

  printf("Making window\n");
  Window window = window_create(argv[0]);
  if (!window.window)
    return -1;

  printf("Initializing objects\n");
  Chart chart = chart_create(window.width, window.height);
  window.chart = &chart;
  axes_init(window.chart);

  printf("Starting main loop\n");
  glClearColor(0.2, 0.3, 0.3, 1.0);
  glEnable(GL_DEPTH_TEST);
  // glPolygonMode(GL_FRONT_AND_BACK, GL_LINE);

  u64 frame = 0;
  while (!glfwWindowShouldClose(window.window)) {
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);

    // Update state with input
    axes_update(&window);

    // Render
    render_frame(&window);
    glfwSwapBuffers(window.window);

    // Grab new input
    glfwPollEvents();
    window_update(&window);

    frame += 1;
  }

  glfwDestroyWindow(window.window);
  glfwTerminate();
  return 0;
}

