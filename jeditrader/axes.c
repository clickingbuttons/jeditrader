#include <GL/glew.h>

#include "axes.h"
#include "linalg.h"
#include "cam.h"
#include "chart.h"

#include <stdio.h>

GLuint program, vertex_shader, fragment_shader, vao, vbo;
GLint uni_world;

void sel_reset(Axes* axes) {
  axes->selecting = false;
  axes->sel_start.x = 0;
  axes->sel_start.y = 0;
  axes->sel_end.x = 0;
  axes->sel_end.y = 0;
}

void sel_write_vertices(Axes* axes) {
  float min_x = axes->selecting ? min(axes->sel_start.x, axes->sel_end.x) : 0;
  float min_y = axes->selecting ? min(axes->sel_start.y, axes->sel_end.y) : 0;
  float max_x = axes->selecting ? max(axes->sel_start.x, axes->sel_end.x) : 0;
  float max_y = axes->selecting ? max(axes->sel_start.y, axes->sel_end.y) : 0;

  axes->vertices[6][0] = min_x;
  axes->vertices[6][1] = -min_y;

  axes->vertices[7][0] = min_x;
  axes->vertices[7][1] = -max_y;

  axes->vertices[8][0] = min_x;
  axes->vertices[8][1] = -max_y;

  axes->vertices[9][0] = max_x;
  axes->vertices[9][1] = -max_y;

  axes->vertices[10][0] = max_x;
  axes->vertices[10][1] = -max_y;

  axes->vertices[11][0] = max_x;
  axes->vertices[11][1] = -min_y;

  axes->vertices[12][0] = max_x;
  axes->vertices[12][1] = -min_y;

  axes->vertices[13][0] = min_x;
  axes->vertices[13][1] = -min_y;
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

void init_buffers(Axes* axes, double aspect_ratio) {
  axes->vertices[1][0] *= aspect_ratio;
  glGenBuffers(1, &vbo);
  glBindBuffer(GL_ARRAY_BUFFER, vbo);
  glBufferData(GL_ARRAY_BUFFER, sizeof(axes->vertices), axes->vertices, GL_DYNAMIC_DRAW);

  glGenVertexArrays(1, &vao);
  glBindVertexArray(vao);
  glEnableVertexAttribArray(0);
  glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 6 * sizeof(float), NULL);
  glEnableVertexAttribArray(1);
  size_t offset = 3 * sizeof(float);
  glVertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, 6 * sizeof(float), (void*)offset);
}

Axes axes_default() {
  float x = 10;
  float y = 10;
  float z = 10;
  return (Axes) {
    .x = 10,
    .y = 10,
    .z = 10,
    .vertices = {
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
    },
    .selecting = false,
    .sel_start = (vec2) { 0 },
    .sel_end = (vec2) { 0 },
  };
}

void axes_init(Axes *axes, double aspect_ratio) {
  init_program();
  uni_world = glGetUniformLocation(program, "gWorld");
  init_buffers(axes, aspect_ratio);
}

void axes_render_frame(Axes* axes, mat4 g_world) {
  glUseProgram(program);
  glBindVertexArray(vao);
  glBindBuffer(GL_ARRAY_BUFFER, vbo);
  sel_write_vertices(axes);
  glBufferData(GL_ARRAY_BUFFER, sizeof(axes->vertices), axes->vertices, GL_DYNAMIC_DRAW);
  glUniformMatrix4fv(uni_world, 1, GL_FALSE, (const float*)(&g_world));
  glDrawArrays(GL_LINES, 0, sizeof(axes->vertices)/sizeof(float));
}

vec3 line_plane_collision(vec3 plane_norm, vec3 plane_pnt, vec3 ray_dir, vec3 ray_pnt) {
  vec3 diff = vec3_sub(ray_pnt, plane_pnt);
  float prod1 = vec3_dot(diff, plane_norm);
  float prod2 = vec3_dot(ray_dir, plane_norm);
  float prod3 = prod1 / prod2;

  return vec3_sub(ray_pnt, vec3_multf(ray_dir, prod3));
}

vec3 world_coords_xyz(Window* window, Cam* cam) {
  // https://antongerdelan.net/opengl/raycasting.html
  // Step 0: 2d Viewport Coordinates
  // Step 1: 3d Normalised Device Coordinates
  double x = (2.0 * window->mouse_x) / (float)window->width - 1.0;
  double y = 1.0 - (2.0 * window->mouse_y) / (float)window->height;
  // Step 2: 4d Homogeneous Clip Coordinates
  vec4 ray_clip = (vec4) { x, y, -1.0, 1.0 };
  // Step 3: 4d Eye (Camera) Coordinates
  vec4 ray_eye = mat4_mult_vec4(mat4_inv(window->chart->perspective), ray_clip);
  ray_eye.z = 1.0f;
  ray_eye.w = 0.0f;
  // Step 4: 4d World Coordinates
  vec4 ray_world = mat4_mult_vec4(mat4_inv(window->chart->look), ray_eye);

  // Map coords to point on xy plane
  vec3 xyz_point = line_plane_collision(Vec3(0, 0, 1), Vec3(0, 0, 0), ray_world.xyz, cam->eye);
  xyz_point.x *= -1;

  return xyz_point;
}

void axes_update(Axes* axes, Window* window) {
  bool button1_last = window->mouse_last[GLFW_MOUSE_BUTTON_1];
  bool button1_cur = window->mouse_cur[GLFW_MOUSE_BUTTON_1];
  if (button1_last != button1_cur) {
    vec3 xyz_point = world_coords_xyz(window, &window->chart->cam);
    if (!axes->selecting && button1_cur == GLFW_PRESS) {
      axes->selecting = true;
      axes->sel_start = xyz_point.xy;
    } else if (button1_cur == GLFW_RELEASE) {
      sel_reset(axes);
      sel_write_vertices(axes);
    }
  }
  if (axes->selecting) {
    vec3 xyz_point = world_coords_xyz(window, &window->chart->cam);
    axes->sel_end = xyz_point.xy;
    sel_write_vertices(axes);
  }
}

