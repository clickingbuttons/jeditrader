#pragma once

#include "linalg.h"
#include "window.h"

#include <GLFW/glfw3.h>

Cam cam_default();
void cam_update(Window* window);
void cam_handle_input(GLFWwindow* window, double loop_time, struct Cam *cam);

