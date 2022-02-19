#pragma once

#include "linalg.h"
#include "window.h"

Axes axes_default();
void axes_init(Axes *axes, double aspect_ratio);
void axes_update(Axes *axes, Window* window);
void axes_render_frame(Axes* axes, mat4 g_world);

