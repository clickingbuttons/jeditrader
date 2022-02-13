#pragma once
#include "linalg.h"

#include <GL/glew.h>
#include <GLFW/glfw3.h>

void axes_init(GLFWwindow *window);
void axes_render_frame(hmm_mat4 g_world);

