#pragma once

#include "linalg.h"
#include <vulkan/vulkan.h>

// forward
typedef struct Vulkan Vulkan;
typedef struct Pipeline Pipeline;

typedef void (*draw_fn_t)(Pipeline* p, VkCommandBuffer b, void* data);

typedef struct Pipeline {
	VkPipelineLayout layout;
	VkPipeline pipeline;

	void* data;
	draw_fn_t draw_fn;
} Pipeline;

Pipeline pipeline_default(Vulkan* v, VkPrimitiveTopology topology, char* asset);
void pipeline_destroy(Pipeline* p, VkDevice d);

