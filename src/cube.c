#include "cube.h"

#include "error.h"
#include "pipeline.h"

static struct PushConstants {
	mat4 mvp;
} PushConstants;

static void pipeline_draw(Pipeline* p, VkCommandBuffer b, void* data) {
	Cam* c = (Cam*) data;
	vkCmdBindPipeline(b, VK_PIPELINE_BIND_POINT_GRAPHICS, p->pipeline);
	struct PushConstants push_constants = {
		.mvp = mat4_mult(c->proj, c->view),
	};
	vkCmdPushConstants(b, p->layout, VK_SHADER_STAGE_VERTEX_BIT, 0, sizeof(PushConstants), &push_constants);
	vkCmdDraw(b, 14, 1, 0, 0);
}

void register_cube_pipeline(Vulkan* v, Cam* c) {
	Pipeline cube = pipeline_default(v, VK_PRIMITIVE_TOPOLOGY_TRIANGLE_STRIP, "cube");
	cube.draw_fn = pipeline_draw;
	cube.data = c;
	vec_push(v->pipelines, cube);
}
