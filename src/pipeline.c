#include "pipeline.h"

#include "alloc.h"
#include "error.h"
#include "string.h"
#include "vulkan.h"

#define SHADER_PATH "/assets/"

VkShaderModule create_shader(Vulkan* v, char* asset_path) {
	string abspath = string_init(v->exec_path);
	string_catc(&abspath, SHADER_PATH);
	string_catc(&abspath, asset_path);

	SDL_RWops* reader = SDL_RWFromFile(sdata(abspath), "rb");
	CHECK_SDL(reader == NULL);
	Sint64 len = reader->seek(reader, 0, RW_SEEK_END);
	if (len == -1) {
		fprintf(stderr, "cannot seek_end in %s\n", sdata(abspath));
		exit(1);
	}
	if (reader->seek(reader, 0, 0) == -1) {
		fprintf(stderr, "cannot seek_start in %s\n", sdata(abspath));
		exit(1);
	}
	size_t offset = 0;
	// TODO: guarantee a uint32_t*
	char* bytes = jdalloc(len);
	reader->read(reader, bytes, 1, len);
	reader->close(reader);

	VkShaderModule res;
	VkShaderModuleCreateInfo createInfo = {
		.sType = VK_STRUCTURE_TYPE_SHADER_MODULE_CREATE_INFO,
		.codeSize = len,
		.pCode = (uint32_t*)bytes,
	};
	CHECK_VK(vkCreateShaderModule(v->device, &createInfo, VK_NULL_HANDLE, &res));

	return res;
}

static VkPipelineLayout create_layout(Vulkan* v, char* name) {
	VkPushConstantRange push_constant = {
		.offset = 0,
		.size = sizeof(mat4),
		.stageFlags = VK_SHADER_STAGE_VERTEX_BIT,
	};
	VkPipelineLayoutCreateInfo info = {
		.sType = VK_STRUCTURE_TYPE_PIPELINE_LAYOUT_CREATE_INFO,
		.pushConstantRangeCount = 1,
		.pPushConstantRanges = &push_constant,
	};
	VkPipelineLayout res;
	CHECK_VK(vkCreatePipelineLayout(v->device, &info, VK_NULL_HANDLE, &res));
	return res;
}

Pipeline pipeline_default(Vulkan* v, VkPrimitiveTopology topology, char* asset) {
	Pipeline res;
	VkPipelineInputAssemblyStateCreateInfo inputAssembly = {
		.sType = VK_STRUCTURE_TYPE_PIPELINE_INPUT_ASSEMBLY_STATE_CREATE_INFO,
		.topology = topology,
		.primitiveRestartEnable = VK_FALSE,
	};

	VkPipelineRasterizationStateCreateInfo rasterizer = {
		.sType = VK_STRUCTURE_TYPE_PIPELINE_RASTERIZATION_STATE_CREATE_INFO,
		.depthClampEnable = VK_FALSE,
		.rasterizerDiscardEnable = VK_FALSE,
		.polygonMode = VK_POLYGON_MODE_FILL,
		.lineWidth = 1.0f,
		.cullMode = VK_CULL_MODE_BACK_BIT,
		.frontFace = VK_FRONT_FACE_CLOCKWISE,
		.depthBiasEnable = VK_FALSE,
	};
	VkPipelineMultisampleStateCreateInfo multisampling = {
		.sType = VK_STRUCTURE_TYPE_PIPELINE_MULTISAMPLE_STATE_CREATE_INFO,
		.sampleShadingEnable = VK_FALSE,
		.rasterizationSamples = VK_SAMPLE_COUNT_1_BIT,
	};
	VkPipelineColorBlendAttachmentState colorBlendAttachment = {
		.colorWriteMask = VK_COLOR_COMPONENT_R_BIT | VK_COLOR_COMPONENT_G_BIT | VK_COLOR_COMPONENT_B_BIT | VK_COLOR_COMPONENT_A_BIT,
	};
	VkPipelineColorBlendStateCreateInfo colorBlending = {
		.sType = VK_STRUCTURE_TYPE_PIPELINE_COLOR_BLEND_STATE_CREATE_INFO,
		.attachmentCount = 1,
		.pAttachments = &colorBlendAttachment,
	};

	string path = string_empty;
	string_printf(&path, "%s/%s.vert.spv", asset, asset);
	VkShaderModule vert_shader = create_shader(v, sdata(path));
	VkPipelineShaderStageCreateInfo vertShaderStageInfo = {
		.sType = VK_STRUCTURE_TYPE_PIPELINE_SHADER_STAGE_CREATE_INFO,
		.stage = VK_SHADER_STAGE_VERTEX_BIT,
		.module = vert_shader,
		.pName = "main",
	};

	path = string_empty;
	string_printf(&path, "%s/%s.frag.spv", asset, asset);
	VkShaderModule frag_shader = create_shader(v, sdata(path));
	VkPipelineShaderStageCreateInfo fragShaderStageInfo = {
		.sType = VK_STRUCTURE_TYPE_PIPELINE_SHADER_STAGE_CREATE_INFO,
		.stage = VK_SHADER_STAGE_FRAGMENT_BIT,
		.module = frag_shader,
		.pName = "main",
	};

	VkPipelineShaderStageCreateInfo shaderStages[] = {vertShaderStageInfo, fragShaderStageInfo};

	res.layout = create_layout(v, asset);
	VkGraphicsPipelineCreateInfo pipelineInfo = {
		.sType = VK_STRUCTURE_TYPE_GRAPHICS_PIPELINE_CREATE_INFO,
		.stageCount = 2,
		.pStages = shaderStages,
		.pInputAssemblyState = &inputAssembly,
		.pRasterizationState = &rasterizer,
		.pMultisampleState = &multisampling,
		.pColorBlendState = &colorBlending,
		.layout = res.layout,
		.renderPass = v->renderpass,
		.basePipelineHandle = VK_NULL_HANDLE,
	};
	CHECK_VK(vkCreateGraphicsPipelines(v->device, VK_NULL_HANDLE, 1, &pipelineInfo, VK_NULL_HANDLE, &res.pipeline));

	vkDestroyShaderModule(v->device, vert_shader, VK_NULL_HANDLE);
	vkDestroyShaderModule(v->device, frag_shader, VK_NULL_HANDLE);

	return res;
}

void pipeline_destroy(Pipeline* p, VkDevice d) {
	vkDestroyPipelineLayout(d, p->layout, VK_NULL_HANDLE);
	vkDestroyPipeline(d, p->pipeline, VK_NULL_HANDLE);
}
