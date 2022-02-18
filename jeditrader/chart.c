#include "chart.h"

Chart chart_create(int width, int height) {
  Chart res = { 0 };
  res.width = width;
  res.height = height;
  res.aspect_ratio = (double)width / (double)height;
  res.cam = cam_default();

  res.perspective = perspective_project(45, res.aspect_ratio, 0.1, 1000);
  res.look = look_at(res.cam.eye, res.cam.direction, res.cam.up);
  chart_update(&res);

  return res;
}

void chart_update(Chart* c) {
  c->look = look_at(c->cam.eye, c->cam.direction, c->cam.up);
  c->g_world = mat4_mult(c->look, c->perspective);
  c->g_world = mat4_transpose(c->g_world);
}

