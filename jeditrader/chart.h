#pragma once

#include "linalg.h"

typedef struct Axes {
  // Axes
  float x;
  float y;
  float z;
  float vertices[14][6];
  // XY selection
  bool selecting;
  vec2 sel_start;
  vec2 sel_end;
} Axes;

typedef struct Cam {
  vec3 eye;
  vec3 direction;
  vec3 up;
  float pitch;
  float yaw;
} Cam;

typedef struct Chart {
  int width;
  int height;
  float aspect_ratio;
  Cam cam;
  Axes axes;
  mat4 perspective;
  mat4 look;
  mat4 g_world;
} Chart;

void chart_init(Chart* c, int width, int height);
void chart_resize(Chart* c);
void chart_update(Chart* c);

