#pragma once

#include "linalg.h"
#include "cam.h"

typedef struct Chart {
  int width;
  int height;
  double aspect_ratio;
  Cam cam;
  mat4 perspective;
  mat4 look;
  mat4 g_world;
} Chart;

Chart chart_create(int width, int height);
void chart_resize(Chart* c);
void chart_update(Chart* c);

