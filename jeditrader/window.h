#pragma once

#include "linalg.h"
#include "chart.h"

#include <GL/glew.h>
#include <GLFW/glfw3.h>

// Can't easily share context between windows
typedef struct GLContext {
  GLuint program, vao, vbo, ebo;
  GLint uni_world;
} GLContext;

typedef struct Window {
  /* window MUST be first for GLFW callbacks */
  GLFWwindow* window;
  int width;
  int height;
  float aspect_ratio;
  Chart *chart;
  char keyboard_last[GLFW_KEY_LAST + 1];
  char keyboard_cur[GLFW_KEY_LAST + 1];
  char mouse_last[GLFW_MOUSE_BUTTON_LAST + 1];
  char mouse_cur[GLFW_MOUSE_BUTTON_LAST + 1];
  int mouse_x;
  int mouse_y;
  // Rendering
  GLContext axes, cube;
} Window;

int window_init(Window* window, char *title);

void window_update(Window *window);

