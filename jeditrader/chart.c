#include "chart.h"

Chart chart_create(int width, int height) {
  Chart res = { 0 };
  res.width = width;
  res.height = height;
  res.aspect_ratio = (double)width / (double)height;
  res.cam = cam_default();

  return res;
}
