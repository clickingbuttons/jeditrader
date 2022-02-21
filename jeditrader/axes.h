#pragma once

#include "linalg.h"
#include "window.h"

Axes axes_default();
void axes_init(Axes *axes, Window* window);
void axes_update(Axes *axes, Window* window);
void axes_render_frame(Axes* axes, Window* window);

