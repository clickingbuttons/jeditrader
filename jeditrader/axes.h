#pragma once

#include "window.h"

Axes axes_default();
void axes_init(Window* window, Axes* axes);
void axes_update(Window* window, Axes* axes);
void axes_render_frame(Window* window, Axes* axes);
