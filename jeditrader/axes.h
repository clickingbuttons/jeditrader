#pragma once
#include "linalg.h"
#include "window.h"

void axes_init(Window *window);
void axes_render_frame(mat4 g_world);
void axes_mouse_button_callback(GLFWwindow* window, int button, int action, int mods);

