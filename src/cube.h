#pragma once

#include "cam.h"
#include "vulkan.h"

void register_cube_pipeline(Vulkan* v, Cam* c);
void destroy_cube_pipeline(VkDevice d);
