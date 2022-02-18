#include <GL/glew.h>
#include <string.h>
#include <stdio.h>

#include "window.h"

void window_size_callback(GLFWwindow *glfwWindow, int width, int height) {
  Window* window = (Window*)glfwWindow;
  window->width = width;
  window->height = height;
  window->aspect_ratio = (double)width / (double)height;
  printf("resize: %dx%d\n", width, height);
  glViewport(0, 0, width, height);
}

void error_callback_gl(GLenum source, GLenum type, GLuint id, GLenum severity,
                       GLsizei length, const GLchar *msg, const void *data) {
  char *_source;
  char *_type;
  char *_severity;

  switch (source) {
  case GL_DEBUG_SOURCE_API:
    _source = "API";
    break;

  case GL_DEBUG_SOURCE_WINDOW_SYSTEM:
    _source = "WINDOW SYSTEM";
    break;

  case GL_DEBUG_SOURCE_SHADER_COMPILER:
    _source = "SHADER COMPILER";
    break;

  case GL_DEBUG_SOURCE_THIRD_PARTY:
    _source = "THIRD PARTY";
    break;

  case GL_DEBUG_SOURCE_APPLICATION:
    _source = "APPLICATION";
    break;

  case GL_DEBUG_SOURCE_OTHER:
    _source = "OTHER";
    break;

  default:
    _source = "UNKNOWN";
    break;
  }

  switch (type) {
  case GL_DEBUG_TYPE_ERROR:
    _type = "ERROR";
    break;

  case GL_DEBUG_TYPE_DEPRECATED_BEHAVIOR:
    _type = "DEPRECATED BEHAVIOR";
    break;

  case GL_DEBUG_TYPE_UNDEFINED_BEHAVIOR:
    _type = "UDEFINED BEHAVIOR";
    break;

  case GL_DEBUG_TYPE_PORTABILITY:
    _type = "PORTABILITY";
    break;

  case GL_DEBUG_TYPE_PERFORMANCE:
    _type = "PERFORMANCE";
    break;

  case GL_DEBUG_TYPE_OTHER:
    _type = "OTHER";
    break;

  case GL_DEBUG_TYPE_MARKER:
    _type = "MARKER";
    break;

  default:
    _type = "UNKNOWN";
    break;
  }

  switch (severity) {
  case GL_DEBUG_SEVERITY_HIGH:
    _severity = "HIGH";
    break;

  case GL_DEBUG_SEVERITY_MEDIUM:
    _severity = "MEDIUM";
    break;

  case GL_DEBUG_SEVERITY_LOW:
    _severity = "LOW";
    break;

  case GL_DEBUG_SEVERITY_NOTIFICATION:
    _severity = "NOTIFICATION";
    break;

  default:
    _severity = "UNKNOWN";
    break;
  }

  printf("GL[%d %s %s %s]: %s\n", id, _severity, _type, _source, msg);
}

Window window_create(char *title) {
  Window res = { 0 };
  //glfwWindowHint(GLFW_SAMPLES, 16);
  //glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 4);
  //glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 0);
  //glfwWindowHint(GLFW_OPENGL_FORWARD_COMPAT, GLFW_TRUE); // for mac
  //glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);
  glfwWindowHint(GLFW_RESIZABLE, GLFW_FALSE); // for debugging on i3

  res.width = 1920;
  res.height = 1080;
  res.aspect_ratio = (double)res.width / (double)res.height;
  res.window = glfwCreateWindow(res.width, res.height, title, NULL, NULL);
  if (!res.window) {
    glfwTerminate();
    return res;
  }
  glfwMakeContextCurrent(res.window);
  glewExperimental = GL_TRUE;
  int err = glewInit();
  if (err != 0) {
    printf("GlewInit() failed with code %d\n", err);
    return res;
  }
  printf("Registering error_callback_gl\n");
  glEnable(GL_DEBUG_OUTPUT);
  glDebugMessageCallback(error_callback_gl, NULL);

  printf("Renderer: %s\n", glGetString(GL_RENDERER));
  printf("OpenGL version supported: %s\n", glGetString(GL_VERSION));

  glfwSetWindowSizeCallback(res.window, window_size_callback);

  return res;
}

void window_update(Window *window) {
  // TODO: cleverly find keys and mouse buttons on _GLFWwindow
  // https://github.com/glfw/glfw/blob/df8d7bc892937a8b0f7c604c92a9f64f383cf48c/src/internal.h#L549

  size_t num_keys = sizeof(window->keyboard_cur);
  memcpy(window->keyboard_last, window->keyboard_cur, num_keys);

  for (size_t i = GLFW_KEY_SPACE; i < num_keys; i++) {
    // https://github.com/glfw/glfw/blob/df8d7bc892937a8b0f7c604c92a9f64f383cf48c/src/input.c#L661
    window->keyboard_cur[i] = glfwGetKey(window->window, i);
  }

  size_t num_mouse_buttons = sizeof(window->mouse_cur);
  memcpy(window->mouse_last, window->mouse_cur, num_mouse_buttons);

  for (size_t i = 0; i < num_mouse_buttons; i++) {
    // https://github.com/glfw/glfw/blob/df8d7bc892937a8b0f7c604c92a9f64f383cf48c/src/input.c#L684
    window->mouse_cur[i] = glfwGetMouseButton(window->window, i);
  }
}

