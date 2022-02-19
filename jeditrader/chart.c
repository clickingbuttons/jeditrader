#include "chart.h"
#include "cam.h"
#include "axes.h"

void chart_init(Chart* res, int width, int height) {
  res->width = width;
  res->height = height;
  res->aspect_ratio = (double)width / (double)height;
  res->cam = (Cam) {};
  cam_default(&res->cam);
  res->axes = axes_default();

  chart_resize(res);
  chart_update(res);
}

void chart_update(Chart* c) {
  c->look = look_at(c->cam.eye, c->cam.direction, c->cam.up);
  c->g_world = mat4_mult(c->perspective, c->look);
  c->g_world = c->g_world;
}

void chart_resize(Chart* c) {
  c->perspective = perspective_project(45, c->aspect_ratio, 0.1, 1000);
}
