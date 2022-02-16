#include "axes.h"
#include "linalg.h"
#include "cam.h"
#include "window.h"
#include "chart.h"

#include <stdio.h>

GLuint program, vertex_shader, fragment_shader, vao, vbo;
GLint uni_world;

// Axes
float x = 10;
float y = 10;
float z = 10;
float vertices[14][6] = {
  // pos       ,  color
  // x axis
   0, 0,      0,  1, 0, 0,
  10, 0,      0,  1, 0, 0,
  // y axis
  0,   0,     0,  0, 1, 0,
  0, -10,     0,  0, 1, 0,
  // z axis
  0,  0,      0,  0, 0, 1,
  0,  0,     10,  0, 0, 1,
  // Selection
  0,  0, 0.001f, 0, 0, 1,
  0,  0, 0.001f, 0, 0, 1,
  0,  0, 0.001f, 0, 0, 1,
  0,  0, 0.001f, 0, 0, 1,
  0,  0, 0.001f, 0, 0, 1,
  0,  0, 0.001f, 0, 0, 1,
  0,  0, 0.001f, 0, 0, 1,
  0,  0, 0.001f, 0, 0, 1,
};

// XY selection
bool sel_started = false;
bool sel_ended = false;
vec2 sel_start = { 0 };
vec2 sel_end = { 0 };

void sel_reset() {
  sel_started = false;
  sel_ended = false;
  sel_start.x = 0;
  sel_start.y = 0;
  sel_end.x = 0;
  sel_end.y = 0;
}

void sel_write_vertices() {
  float min_x = sel_started ? min(sel_start.x, sel_end.x) : 0;
  float min_y = sel_started ? min(sel_start.y, sel_end.y) : 0;
  float max_x = sel_started ? max(sel_start.x, sel_end.x) : 0;
  float max_y = sel_started ? max(sel_start.y, sel_end.y) : 0;

  vertices[6][1] = min_x;
  vertices[6][2] = -min_y;

  vertices[7][1] = min_x;
  vertices[7][2] = -max_y;

  vertices[7][1] = min_x;
  vertices[7][2] = -max_y;

  vertices[7][1] = max_x;
  vertices[7][2] = -max_y;

  vertices[7][1] = max_x;
  vertices[7][2] = -max_y;

  vertices[7][1] = max_x;
  vertices[7][2] = -min_y;

  vertices[7][1] = max_x;
  vertices[7][2] = -min_y;

  vertices[7][1] = min_x;
  vertices[7][2] = -min_y;
}

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

void init_buffers(Window *window) {
  vertices[1][0] *= window->aspect_ratio;
  glGenBuffers(1, &vbo);
  glBindBuffer(GL_ARRAY_BUFFER, vbo);
  glBufferData(GL_ARRAY_BUFFER, sizeof(vertices), vertices, GL_DYNAMIC_DRAW);

  glGenVertexArrays(1, &vao);
  glBindVertexArray(vao);
  glEnableVertexAttribArray(0);
  glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 6 * sizeof(float), NULL);
  glEnableVertexAttribArray(1);
  size_t offset = 3 * sizeof(float);
  glVertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, 6 * sizeof(float), (void*)offset);
}

void axes_init(Window *window) {
  init_program();
  uni_world = glGetUniformLocation(program, "gWorld");
  init_buffers(window);
}

void axes_render_frame(mat4 g_world) {
  glUseProgram(program);
  glBindVertexArray(vao);
  glBindBuffer(GL_ARRAY_BUFFER, vbo);
  sel_write_vertices();
  glBufferData(GL_ARRAY_BUFFER, sizeof(vertices), vertices, GL_DYNAMIC_DRAW);
  glUniformMatrix4fv(uni_world, 1, GL_TRUE, (const float*)(&g_world));
  glDrawArrays(GL_LINES, 0, sizeof(vertices)/sizeof(float));
}

vec2 line_plane_collision(vec3 plane_norm, vec3 plane_pnt, vec3 ray_dir, vec3 ray_pnt) {
  vec2 res = { 0 };

  float ndotu = vec3_dot(plane_norm, ray_dir);
  if (ndotu == 0.0) {
    return res;
  }

  vec3 w = vec3_sub(ray_pnt, plane_pnt);
  float si = -vec3_dot(plane_norm, w) / ndotu;
  vec3 tao = vec3_add(vec3_add(w, vec3_multf(ray_dir, si)), ray_pnt);

  res.x = tao.x;
  res.y = tao.y;
  return res;
}

vec2 world_coords_xy(Window* window, struct Cam* cam) {
  // https://antongerdelan.net/opengl/raycasting.html
  // Step 0: 2d Viewport Coordinates
  double xoff, yoff;
  glfwGetCursorPos(window->window, &xoff, &yoff);
  // Step 1: 3d Normalised Device Coordinates
  double x = (2.0 * xoff) / (float)window->width - 1.0;
  double y = 1.0 - (2.0 * yoff) / (float)window->height;
  // Step 2: 4d Homogeneous Clip Coordinates
  vec4 ray_clip = (vec4) { x, y, -1.0, 1.0 };
  // Step 3: 4d Eye (Camera) Coordinates
  // TODO: config for keys and FOV
  mat4 projection_matrix = perspective_project(45.0f, window->aspect_ratio, 0.1, 1000);
  vec4 ray_eye = mat4_mult_vec4(mat4_transpose(projection_matrix), ray_clip);
  ray_eye.z = 1.0;
  ray_eye.w = 0.0;
  // Step 4: 4d World Coordinates
  mat4 view_matrix = look_at(cam->eye, cam->direction, cam->up);
  vec4 ray_world = mat4_mult_vec4(mat4_transpose(view_matrix), ray_eye);

  // Map coords to point on xy plane
  vec2 xy_point = line_plane_collision(Vec3(0, 0, 1), Vec3(0, 0, 0), ray_world.xyz, cam->eye);
  xy_point.x *= -1;

  return xy_point;
}

void axes_mouse_button_callback(GLFWwindow* glfwWindow, int button, int action, int mods) {
  Window* window = (Window *)glfwWindow;
  if (button == GLFW_MOUSE_BUTTON_1) {
    if (sel_started && sel_ended) {
      sel_reset();
    }
    vec2 xy_point = world_coords_xy(window, &window->chart->cam);
    if (xy_point.x != 0.0f && xy_point.y != 0.0f) {
      if (!sel_started && action == GLFW_PRESS) {
        sel_started = true;
        sel_start = xy_point;
      } else if (action == GLFW_RELEASE) {
        sel_ended = true;
        sel_end = xy_point;
      }
    }
  } else {
    sel_reset();
  }
}

