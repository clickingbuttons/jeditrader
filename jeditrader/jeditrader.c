#include "inttypes.h"
#include "linalg.h"
#include "axes.h"
#include "window.h"
#include "cam.h"
#include "chart.h"
#include "platform.h"

#define MAX_NUM_CHARTS 1024

#include <pthread.h>
#include <stdio.h>
#include <time.h>

void error_callback_glfw(int error, const char *description) {
  fprintf(stderr, "GLFW error: %s\n", description);
}

void* run_chart(void *ptr) {
  char* name = ptr;
  printf("Making window\n");
  Window window;
  if (window_init(&window, name))
    return (void*)-1;

  printf("Initializing objects\n");
  Chart chart;
  chart_init(&chart, window.width, window.height);
  window.chart = &chart;
  axes_init(&window.chart->axes, window.aspect_ratio);

  printf("Starting %s main loop\n", name);
  glEnable(GL_DEPTH_TEST);
  // glPolygonMode(GL_FRONT_AND_BACK, GL_LINE);

  u64 frame = 0;
  u64 nanos_start = get_nanotime();
  u64 nanos_diff = 0;
  while (!glfwWindowShouldClose(window.window)) {
    // Grab new input
    glfwPollEvents();
    window_update(&window);

    glClearColor(0.2, 0.3, 0.3, 1.0);
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);

    // Update state with input
    axes_update(&window.chart->axes, &window);
    cam_update(&window.chart->cam, &window, nanos_diff);
    chart_update(window.chart);

    // Render
    if (!glfwGetWindowAttrib(window.window, GLFW_ICONIFIED)) {
      axes_render_frame(&window.chart->axes, window.chart->g_world);
      glfwSwapBuffers(window.window);
    } else {
      printf("minimized\n");
    }

    frame += 1;
    u64 nanotime = get_nanotime();
    nanos_diff = nanotime - nanos_start;
    nanos_start = nanotime;
  }

  glfwDestroyWindow(window.window);

  return NULL;
}

int main(int argc, char *argv[]) {
  printf("Starting %s\n", argv[0]);
  if (!glfwInit())
    return -1;

  printf("Registering error_callback_glfw\n");
  glfwSetErrorCallback(error_callback_glfw);

  pthread_t threads[MAX_NUM_CHARTS];
  int ret = 0;

  for (int i = 1; i < argc; i++) {
    pthread_create(&threads[i - 1], NULL, *run_chart, argv[i]);
  }

  for (int i = 1; i < argc; i++) {
    void* thread_ret;
    pthread_join(threads[i - 1], thread_ret);
    if (thread_ret != NULL) {
      ret = *((int*)thread_ret);
      printf("window %s error %d\n", argv[i], ret);
    }
  }

  glfwTerminate();
  return ret;
}

