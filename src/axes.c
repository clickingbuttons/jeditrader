#include "axes.h"

#include "error.h"
#include "pipeline.h"

static struct PushConstants {
	mat4 view;
	mat4 proj;
} PushConstants;

static void pipeline_draw(Pipeline* p, VkCommandBuffer b, void* data) {
	Cam* c = (Cam*) data;
	vkCmdBindPipeline(b, VK_PIPELINE_BIND_POINT_GRAPHICS, p->pipeline);
	struct PushConstants push_constants = {
		.view = c->view,
		.proj = c->proj,
	};
	vkCmdPushConstants(b, p->layout, VK_SHADER_STAGE_VERTEX_BIT, 0, sizeof(PushConstants), &push_constants);
	vkCmdDraw(b, 6, 1, 0, 0);
}

void register_axes_pipeline(Vulkan* v, Cam* c) {
	Pipeline axes = pipeline_default(v, VK_PRIMITIVE_TOPOLOGY_TRIANGLE_LIST, "axes");
	axes.draw_fn = pipeline_draw;
	axes.data = c;
	vec_push(v->pipelines, axes);
}

