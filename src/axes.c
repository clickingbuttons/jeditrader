#include "axes.h"

#include "error.h"
#include "pipeline.h"

static void pipeline_draw(Pipeline* p, VkCommandBuffer b, void* data) {
}

void register_axes_pipeline(Vulkan* v, Cam* c) {
	Pipeline axes = pipeline_default(v, "axes");
	axes.draw_fn = pipeline_draw;
	vec_push(v->pipelines, axes);
}

