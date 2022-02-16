#pragma once

#include <GL/glew.h>
#include <GLFW/glfw3.h>

typedef struct Chart Chart;

typedef struct Window {
  /* window MUST be first for GLFW callbacks */
  GLFWwindow* window;
  int width;
  int height;
  double aspect_ratio;
  Chart *chart;
} Window;

Window window_create(char *title);

