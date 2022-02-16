#pragma once

#include "linalg.h"
#include "cam.h"

typedef struct Chart {
  int width;
  int height;
  double aspect_ratio;
  Cam cam;
} Chart;

Chart chart_create(int width, int height);

