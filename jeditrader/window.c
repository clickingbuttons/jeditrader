#include <GL/glew.h>
#include <string.h>
#include <stdio.h>

#include "window.h"

void window_resize(Window *window, int width, int height) {
  printf("resize: %dx%d\n", width, height);
  window->width = width;
  window->height = height;
  window->aspect_ratio = (double)width / (double)height;

  if (window->chart != NULL) {
    window->chart->width = width;
    window->chart->height = height;
    window->chart->aspect_ratio = window->aspect_ratio;
    chart_resize(window->chart);
  }
  glfwMakeContextCurrent(window->window);
  glViewport(0, 0, width, height);
}

void error_callback_gl(GLenum source, GLenum type, GLuint id, GLenum severity,
                       GLsizei length, const GLchar *msg, const void *data) {
  char* src;
  char* typ;
  char* sev;

  switch (source) {
  case GL_DEBUG_SOURCE_API:
    src = "API";
    break;

  case GL_DEBUG_SOURCE_WINDOW_SYSTEM:
    src = "WINDOW SYSTEM";
    break;

  case GL_DEBUG_SOURCE_SHADER_COMPILER:
    src = "SHADER COMPILER";
    break;

  case GL_DEBUG_SOURCE_THIRD_PARTY:
    src = "THIRD PARTY";
    break;

  case GL_DEBUG_SOURCE_APPLICATION:
    src = "APPLICATION";
    break;

  case GL_DEBUG_SOURCE_OTHER:
    src = "OTHER";
    break;

  default:
    src = "UNKNOWN";
    break;
  }

  switch (type) {
  case GL_DEBUG_TYPE_ERROR:
    typ = "ERROR";
    break;

  case GL_DEBUG_TYPE_DEPRECATED_BEHAVIOR:
    typ = "DEPRECATED BEHAVIOR";
    break;

  case GL_DEBUG_TYPE_UNDEFINED_BEHAVIOR:
    typ = "UDEFINED BEHAVIOR";
    break;

  case GL_DEBUG_TYPE_PORTABILITY:
    typ = "PORTABILITY";
    break;

  case GL_DEBUG_TYPE_PERFORMANCE:
    typ = "PERFORMANCE";
    break;

  case GL_DEBUG_TYPE_OTHER:
    typ = "OTHER";
    break;

  case GL_DEBUG_TYPE_MARKER:
    typ = "MARKER";
    break;

  default:
    typ = "UNKNOWN";
    break;
  }

  switch (severity) {
  case GL_DEBUG_SEVERITY_HIGH:
    sev = "HIGH";
    break;

  case GL_DEBUG_SEVERITY_MEDIUM:
    sev = "MEDIUM";
    break;

  case GL_DEBUG_SEVERITY_LOW:
    sev = "LOW";
    break;

  case GL_DEBUG_SEVERITY_NOTIFICATION:
    sev = "NOTIFICATION";
    break;

  default:
    sev = "UNKNOWN";
    break;
  }

  printf("GL[%d %s %s %s]: %s\n", id, sev, typ, src, msg);
}

void window_init(Window* window, char *title) {
  glfwWindowHint(GLFW_SAMPLES, 16);
  // 4.1 is July 26, 2010 and last version OSX supports
  glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 4);
  glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 1);
  glfwWindowHint(GLFW_OPENGL_FORWARD_COMPAT, GLFW_TRUE); // for mac
  glfwWindowHint(GLFW_RESIZABLE, GLFW_FALSE); // for debugging on i3

  window->width = 1920;
  window->height = 1080;
  window->aspect_ratio = (double)window->width / (double)window->height;
  window->window = glfwCreateWindow(window->width, window->height, title, NULL, NULL);
  if (!window->window) {
    glfwTerminate();
    return;
  }
  glfwMakeContextCurrent(window->window);
  glewExperimental = GL_TRUE;
  int err = glewInit();
  if (err != 0) {
    printf("GlewInit() failed with code %d\n", err);
    return;
  }
  printf("Registering error_callback_gl\n");
  glEnable(GL_DEBUG_OUTPUT);
  glDebugMessageCallback(error_callback_gl, NULL);

  printf("Renderer: %s\n", glGetString(GL_RENDERER));
  printf("OpenGL version supported: %s\n", glGetString(GL_VERSION));
}

void window_update(Window *window) {
  // TODO: cleverly find keys and mouse buttons on _GLFWwindow
  // https://github.com/glfw/glfw/blob/df8d7bc892937a8b0f7c604c92a9f64f383cf48c/src/internal.h#L549
  size_t num_keys = sizeof(window->keyboard_cur);
  memcpy(window->keyboard_last, window->keyboard_cur, num_keys);

  // https://github.com/glfw/glfw/blob/df8d7bc892937a8b0f7c604c92a9f64f383cf48c/src/input.c#L661
  for (size_t i = GLFW_KEY_SPACE; i < num_keys; i++) {
    window->keyboard_cur[i] = glfwGetKey(window->window, i);
  }

  size_t num_mouse_buttons = sizeof(window->mouse_cur);
  memcpy(window->mouse_last, window->mouse_cur, num_mouse_buttons);

  for (size_t i = 0; i < num_mouse_buttons; i++) {
    // https://github.com/glfw/glfw/blob/df8d7bc892937a8b0f7c604c92a9f64f383cf48c/src/input.c#L684
    window->mouse_cur[i] = glfwGetMouseButton(window->window, i);
  }

  // TODO: check window width/height > 1, minimized
  int width, height;
  glfwGetWindowSize(window->window, &width, &height);
  if (width != window->width || height != window->height) {
    window_resize(window, width, height);
  }

  double x, y;
  glfwGetCursorPos(window->window, &x, &y);

  window->mouse_x = floor(x);
  window->mouse_y = floor(y);
}

