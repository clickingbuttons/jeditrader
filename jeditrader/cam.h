#pragma once
#include "linalg.h"

#include <GLFW/glfw3.h>

struct Cam {
  vec3 eye;
  vec3 direction;
  vec3 up;
  float pitch;
  float yaw;
};

void cam_load_default(struct Cam *cam);
void cam_handle_input(GLFWwindow* window, double loop_time, struct Cam *cam);
