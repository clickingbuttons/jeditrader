#pragma once

#include "linalg.h"
#include "window.h"

#include <GLFW/glfw3.h>

void cam_default(Cam* cam);
void cam_update(Cam* cam, Window* window, double loop_time);

