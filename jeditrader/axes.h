#pragma once
#include "linalg.h"
#include "window.h"

void axes_init(Chart *chart);
void axes_render_frame(mat4 g_world);
void axes_update(Window* window);

