#include "axes.h"

#include <stdio.h>

GLuint program, vertex_shader, fragment_shader, vao, vbo;
GLint uni_world;

float x = 10;
float y = 10;
float z = 10;
float vertices[] = {
  // pos  ,  color
  // x
   0, 0, 0,  1, 0, 0,
  10, 0, 0,  1, 0, 0,
  // y
  0,   0, 0,  0, 1, 0,
  0, -10, 0,  0, 1, 0,
  // z
  0,  0,  0,  0, 0, 1,
  0,  0, 10,  0, 0, 1,
};

void _print_programme_info_log(GLuint programme) {
  int max_length = 2048;
  int actual_length = 0;
  char program_log[2048];
  glGetProgramInfoLog(programme, max_length, &actual_length, program_log);
  printf("program info log for GL index %u:\n%s", programme, program_log);
}

void init_program() {
  vertex_shader = glCreateShader(GL_VERTEX_SHADER);
  const GLchar* vshader = "#version 330 core\n"
    "layout (location = 0) in vec3 Position;\n"
    "layout (location = 1) in vec3 inColor;\n"
    "uniform mat4 gWorld;\n"
    "out vec4 Color;\n"
    "void main()\n"
    "{\n"
    "  gl_Position = gWorld * vec4(Position, 1.0);\n"
    "  Color = vec4(inColor, 1.0);\n"
    "}\n";
  glShaderSource(vertex_shader, 1, &vshader, 0);
  glCompileShader(vertex_shader);

  fragment_shader = glCreateShader(GL_FRAGMENT_SHADER);
  const GLchar* fshader = "#version 330 core\n"
    "in vec4 Color;\n"
    "out vec4 outColor;\n"
    "void main()\n"
    "{\n"
    "  outColor = Color;\n"
    "}\n";
  glShaderSource(fragment_shader, 1, &fshader, 0);
  glCompileShader(fragment_shader);

  program = glCreateProgram();
  glAttachShader(program, vertex_shader);
  glAttachShader(program, fragment_shader);
  glLinkProgram(program);
  int params = -1;
  glGetProgramiv(program, GL_LINK_STATUS, &params);
  if (GL_TRUE != params) {
    printf("ERROR: could not link shader programme GL index %u\n", program);
    _print_programme_info_log(program);
  }
}

void init_buffers(GLFWwindow *window) {
  int width, height;
  glfwGetWindowSize(window, &width, &height);
  double ratio = (double)width / (double)height;
  vertices[6] *= ratio;
  glGenBuffers(1, &vbo);
  glBindBuffer(GL_ARRAY_BUFFER, vbo);
  glBufferData(GL_ARRAY_BUFFER, sizeof(vertices), vertices, GL_STATIC_DRAW);

  glGenVertexArrays(1, &vao);
  glBindVertexArray(vao);
  glEnableVertexAttribArray(0);
  glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 6 * sizeof(float), NULL);
  glEnableVertexAttribArray(1);
  size_t offset = 3 * sizeof(float);
  glVertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, 6 * sizeof(float), (void*)offset);
}

void axes_init(GLFWwindow *window) {
  init_program();
  uni_world = glGetUniformLocation(program, "gWorld");
  init_buffers(window);
}

void axes_render_frame(mat4 g_world) {
  glUseProgram(program);
  glBindVertexArray(vao);
  glBindBuffer(GL_ARRAY_BUFFER, vbo);
  //glBufferSubData(GL_ARRAY_BUFFER, 6 * 6 * sizeof(float), 8 * 6 * sizeof(float), get_selection_vertices())
  glUniformMatrix4fv(uni_world, 1, GL_TRUE, (const float*)(&g_world));
  glDrawArrays(GL_LINES, 0, sizeof(vertices)/sizeof(float));
}

