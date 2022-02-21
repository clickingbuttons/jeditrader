#include "axes.h"
#include "linalg.h"
#include "cam.h"
#include "chart.h"

#include <GL/glew.h>
#include <stdio.h>

static void sel_reset(Axes* axes) {
  axes->selecting = false;
  axes->sel_start.x = 0;
  axes->sel_start.y = 0;
  axes->sel_end.x = 0;
  axes->sel_end.y = 0;
}

static void sel_write_vertices(Axes* axes) {
  float min_x = axes->selecting ? MIN(axes->sel_start.x, axes->sel_end.x) : 0;
  float min_y = axes->selecting ? MIN(axes->sel_start.y, axes->sel_end.y) : 0;
  float max_x = axes->selecting ? MAX(axes->sel_start.x, axes->sel_end.x) : 0;
  float max_y = axes->selecting ? MAX(axes->sel_start.y, axes->sel_end.y) : 0;

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

static void init_program(Axes* axes) {
  GLuint vertex_shader = glCreateShader(GL_VERTEX_SHADER);
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

  GLuint fragment_shader = glCreateShader(GL_FRAGMENT_SHADER);
  const GLchar* fshader = "#version 330 core\n"
    "in vec4 Color;\n"
    "out vec4 outColor;\n"
    "void main()\n"
    "{\n"
    "  outColor = Color;\n"
    "}\n";
  glShaderSource(fragment_shader, 1, &fshader, 0);
  glCompileShader(fragment_shader);

  axes->program = glCreateProgram();
  glAttachShader(axes->program, vertex_shader);
  glAttachShader(axes->program, fragment_shader);
  glLinkProgram(axes->program);
  int params = -1;
  glGetProgramiv(axes->program, GL_LINK_STATUS, &params);
  if (GL_TRUE != params) {
    char program_log[GL_MAX_DEBUG_MESSAGE_LENGTH];
    glGetProgramInfoLog(axes->program, GL_MAX_DEBUG_MESSAGE_LENGTH, NULL, program_log);
    printf("couldn't compile program %u:\n%s", axes->program, program_log);
  }
}

static void init_buffers(Axes* axes, float aspect_ratio) {
  axes->vertices[1][0] *= aspect_ratio;
  glGenBuffers(1, &axes->vbo);
  glBindBuffer(GL_ARRAY_BUFFER, axes->vbo);
  glBufferData(GL_ARRAY_BUFFER, sizeof(axes->vertices), axes->vertices, GL_DYNAMIC_DRAW);

  glGenVertexArrays(1, &axes->vao);
  glBindVertexArray(axes->vao);
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

void axes_init(Axes *axes, float aspect_ratio) {
  init_program(axes);
  axes->uni_world = glGetUniformLocation(axes->program, "gWorld");
  init_buffers(axes, aspect_ratio);
}

void axes_render_frame(Axes* axes, mat4 g_world) {
  glUseProgram(axes->program);
  glBindVertexArray(axes->vao);
  glBindBuffer(GL_ARRAY_BUFFER, axes->vbo);
  sel_write_vertices(axes);
  glBufferData(GL_ARRAY_BUFFER, sizeof(axes->vertices), axes->vertices, GL_DYNAMIC_DRAW);
  glUniformMatrix4fv(axes->uni_world, 1, GL_FALSE, (const float*)(&g_world));
  glDrawArrays(GL_LINES, 0, sizeof(axes->vertices)/sizeof(float));
}

static vec3 line_plane_collision(vec3 plane_norm, vec3 plane_pnt, vec3 ray_dir, vec3 ray_pnt) {
  vec3 diff = vec3_sub(ray_pnt, plane_pnt);
  float prod1 = vec3_dot(diff, plane_norm);
  float prod2 = vec3_dot(ray_dir, plane_norm);
  float prod3 = prod1 / prod2;

  return vec3_sub(ray_pnt, vec3_multf(ray_dir, prod3));
}

// Screen space to world space
static vec3 world_coords_xyz(Window* window, Cam* cam) {
  // https://antongerdelan.net/opengl/raycasting.html
  // Step 0: 2d Viewport Coordinates
  // Step 1: 3d Normalised Device Coordinates
  float x = (2.0 * window->mouse_x) / window->width - 1.0;
  float y = 1.0 - (2.0 * window->mouse_y) / window->height;
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

