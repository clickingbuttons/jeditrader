#include "inttypes.h"
#include "linalg.h"
#include "axes.h"
#include "cam.h"

#include <GL/glew.h>
#include <GLFW/glfw3.h>
#include <stdio.h>
#include <time.h>

void window_size_callback(GLFWwindow *window, int width, int height) {
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

  printf("%d: %s of %s severity, raised from %s: %s\n", id, _type, _severity,
         _source, msg);
}

GLFWwindow *createWindow(char *title) {
  GLFWwindow *res;
  glfwWindowHint(GLFW_SAMPLES, 16);
  //glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 4);
  //glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 0);
  //glfwWindowHint(GLFW_OPENGL_FORWARD_COMPAT, GLFW_TRUE); // for mac
  //glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);
  glfwWindowHint(GLFW_RESIZABLE, GLFW_FALSE); // for debugging on i3

  res = glfwCreateWindow(1920, 1080, title, NULL, NULL);
  if (!res) {
    glfwTerminate();
    return NULL;
  }
  glfwMakeContextCurrent(res);
  glewExperimental = GL_TRUE;
  int err = glewInit();
  if (err != 0) {
    printf("GlewInit() failed with code %d\n", err);
    return NULL;
  }
  printf("Registering error_callback_gl\n");
  glEnable(GL_DEBUG_OUTPUT);
  glDebugMessageCallback(error_callback_gl, NULL);

  printf("Renderer: %s\n", glGetString(GL_RENDERER));
  printf("OpenGL version supported: %s\n", glGetString(GL_VERSION));

  glfwSetWindowSizeCallback(res, window_size_callback);

  return res;
}

void error_callback_glfw(int error, const char *description) {
  fprintf(stderr, "Error: %s\n", description);
}

void render_frame(GLFWwindow* window) {
  struct Cam cam;
  cam_load_default(&cam);

  int width, height;
  glfwGetWindowSize(window, &width, &height);
  float aspect_ratio = (float)width / (float)height;
  mat4 perspective = perspective_project(45, aspect_ratio, 0.1, 1000);
  mat4 look = look_at(cam.eye, cam.direction, cam.up);
  mat4 g_world = mat4_mult(look, perspective);
  axes_render_frame(g_world);
}

int main(int argc, char *argv[]) {
  printf("Starting %s\n", argv[0]);
  if (!glfwInit())
    return -1;

  printf("Registering error_callback_glfw\n");
  glfwSetErrorCallback(error_callback_glfw);

  printf("Making window\n");
  GLFWwindow *window = createWindow(argv[0]);
  if (!window)
    return -1;

  printf("Initializing objects\n");
  axes_init(window);

  printf("Starting main loop\n");
  glClearColor(0.2, 0.3, 0.3, 1.0);
  glEnable(GL_DEPTH_TEST);
  // glPolygonMode(GL_FRONT_AND_BACK, GL_LINE);

  u64 frame = 0;
  while (!glfwWindowShouldClose(window)) {

    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);

    render_frame(window);
    glfwSwapBuffers(window);
    glfwPollEvents();

    frame += 1;
  }

  glfwDestroyWindow(window);
  glfwTerminate();
  return 0;
}

