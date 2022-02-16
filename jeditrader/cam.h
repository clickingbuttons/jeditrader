#pragma once
#include "linalg.h"
#include "window.h"

typedef struct Cam {
  vec3 eye;
  vec3 direction;
  vec3 up;
  float pitch;
  float yaw;
} Cam;

Cam cam_default();
void cam_handle_input(Window* window, double loop_time, Cam *cam);

