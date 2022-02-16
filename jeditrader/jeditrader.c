#include "inttypes.h"
#include "linalg.h"
#include "axes.h"
#include "window.h"
#include "cam.h"
#include "chart.h"

#include <stdio.h>
#include <time.h>

void render_frame(Window* window) {
  Chart* chart = window->chart;
  mat4 perspective = perspective_project(45, chart->aspect_ratio, 0.1, 1000);
  mat4 look = look_at(chart->cam.eye, chart->cam.direction, chart->cam.up);
  mat4 g_world = mat4_mult(look, perspective);

  axes_render_frame(g_world);
}

void mouse_button_callback(GLFWwindow* window, int button, int action, int mods) {
  axes_mouse_button_callback(window, button, action, mods);
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
  axes_init(&window);

  printf("Starting main loop\n");
  glClearColor(0.2, 0.3, 0.3, 1.0);
  glEnable(GL_DEPTH_TEST);
  // glPolygonMode(GL_FRONT_AND_BACK, GL_LINE);

  u64 frame = 0;
  while (!glfwWindowShouldClose(window.window)) {

    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);

    render_frame(&window);
    glfwSwapBuffers(window.window);
    glfwPollEvents();

    frame += 1;
  }

  glfwDestroyWindow(window.window);
  glfwTerminate();
  return 0;
}

