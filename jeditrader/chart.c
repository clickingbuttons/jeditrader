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

  res->num_cubes = 0;
  res->cube_transforms = NULL;
  res->cube_colors = NULL;

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

void chart_write(Chart* c, u32 num_trades) {
  for (u32 i = 0; i < num_trades; i++) {
    mat4* transform = &c->cube_transforms[i];
    transform->data[0][0] = 1;
    transform->data[1][1] = 1;
    transform->data[2][2] = 1;
    transform->data[3][3] = 1;

    vec3* color = &c->cube_colors[i];
    color->b = 1;
  } 
  c->num_cubes = num_trades;
}
