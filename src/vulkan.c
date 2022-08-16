#include "vulkan.h"
#include "string.h"
#include "alloc.h"
#include "inttypes.h"
#include "error.h"

#include <SDL2/SDL_vulkan.h>
#include <vulkan/vulkan_core.h>

#define SHADER_PATH "/assets/shaders/"
#define ARR_LEN(arr) sizeof(arr)/sizeof(arr[0])
#define CLAMP(x, lo, hi)    ((x) < (lo) ? (lo) : (x) > (hi) ? (hi) : (x))

const char* enabled_layers[] = {
#ifdef DEBUG
	"VK_LAYER_KHRONOS_validation",
	"VK_LAYER_LUNARG_param_checker",
	"VK_LAYER_LUNARG_standard_validation",
#endif
};

const uint16_t indices[] = {3, 2, 6, 7, 4, 2, 0, 3, 1, 6, 5, 4, 1, 0};

static VKAPI_ATTR VkBool32 VKAPI_CALL debugCallback(VkDebugUtilsMessageSeverityFlagBitsEXT messageSeverity, VkDebugUtilsMessageTypeFlagsEXT messageType, const VkDebugUtilsMessengerCallbackDataEXT* pCallbackData, void* pUserData) {
	fprintf(stderr, "VK: %s\n", pCallbackData->pMessage);

	return VK_FALSE;
}

VkDebugUtilsMessengerCreateInfoEXT create_debug_info() {
	return (VkDebugUtilsMessengerCreateInfoEXT) {
		.sType = VK_STRUCTURE_TYPE_DEBUG_UTILS_MESSENGER_CREATE_INFO_EXT,
		.messageSeverity = VK_DEBUG_UTILS_MESSAGE_SEVERITY_VERBOSE_BIT_EXT | VK_DEBUG_UTILS_MESSAGE_SEVERITY_WARNING_BIT_EXT | VK_DEBUG_UTILS_MESSAGE_SEVERITY_ERROR_BIT_EXT,
		.messageType = VK_DEBUG_UTILS_MESSAGE_TYPE_GENERAL_BIT_EXT | VK_DEBUG_UTILS_MESSAGE_TYPE_VALIDATION_BIT_EXT | VK_DEBUG_UTILS_MESSAGE_TYPE_PERFORMANCE_BIT_EXT,
		.pfnUserCallback = debugCallback,
	};
}

void init_instance(Vulkan* v, SDL_Window* window) {
	const char* list[MAX_EXTENSIONS] = {
		VK_EXT_DEBUG_UTILS_EXTENSION_NAME
	};
	unsigned int count = ARR_LEN(list) - 1;
	CHECK_SDL(SDL_Vulkan_GetInstanceExtensions(window, &count, list + 1) != SDL_TRUE);
	count++;
	LOG("%d extensions", count);
	for (int i = 0; i < count; i++)
		LOG("\t %s", list[i]);


	VkDebugUtilsMessengerCreateInfoEXT debugCreateInfo = create_debug_info();

  VkApplicationInfo appInfo = {
		.sType = VK_STRUCTURE_TYPE_APPLICATION_INFO,
		.pApplicationName = SDL_GetWindowTitle(window),
		.applicationVersion = VK_MAKE_VERSION(1, 0, 0),
		.pEngineName = "vulkan_utils.c",
		.engineVersion = VK_MAKE_VERSION(1, 0, 0),
		.apiVersion = VK_API_VERSION_1_2,
	};

	VkInstanceCreateInfo create_info = {
		.sType = VK_STRUCTURE_TYPE_INSTANCE_CREATE_INFO,
		.pApplicationInfo = &appInfo,
		.enabledExtensionCount = count,
		.ppEnabledExtensionNames = list,
		.enabledLayerCount = ARR_LEN(enabled_layers),
		.ppEnabledLayerNames = enabled_layers,
		.flags = VK_INSTANCE_CREATE_ENUMERATE_PORTABILITY_BIT_KHR,
#ifdef DEBUG
		.pNext = &debugCreateInfo,
#endif
	};
	CHECK_VK(vkCreateInstance(&create_info, VK_NULL_HANDLE, &v->instance));
}

void init_debug(Vulkan* v) {
	PFN_vkCreateDebugUtilsMessengerEXT func = (PFN_vkCreateDebugUtilsMessengerEXT) vkGetInstanceProcAddr(v->instance, "vkCreateDebugUtilsMessengerEXT");
	CHECK_VK(func == NULL);

	VkDebugUtilsMessengerCreateInfoEXT debugCreateInfo = create_debug_info();
	CHECK_VK(func(v->instance, &debugCreateInfo, VK_NULL_HANDLE, &v->debug_messenger));
}

void init_surface(Vulkan* v, SDL_Window* window) {
	CHECK_SDL(SDL_Vulkan_CreateSurface(window, v->instance, &v->surface) != SDL_TRUE);
}

void init_physical_device(Vulkan *v) {
	VkPhysicalDevice list[MAX_DEVICES];
	unsigned int count = ARR_LEN(list);
	CHECK_VK(vkEnumeratePhysicalDevices(v->instance, &count, list));
	LOG("%d devices", count);
	for (int i = 0; i < count; i++)
		LOG("\t %p", list[i]);

	// TODO: pickem
	v->physical_device = list[0];
}

void init_device(Vulkan *v) {
	VkQueueFamilyProperties list[MAX_QUEUE_FAMILIES];
	unsigned int count = ARR_LEN(list);
	vkGetPhysicalDeviceQueueFamilyProperties(v->physical_device, &count, list);
	LOG("%d queue families", count);
	for (int i = 0; i < count; i++)
		LOG("\t %x", list[i].queueFlags);

	for (int i = 0; i < count; i++) {
		if (list[i].queueFlags & VK_QUEUE_GRAPHICS_BIT)
			v->q_graphics_index = i;
		VkBool32 surface_support = false;
		CHECK_VK(vkGetPhysicalDeviceSurfaceSupportKHR(v->physical_device, i, v->surface, &surface_support));
		if (surface_support)
			v->q_presentation_index = i;
		if (v->q_graphics_index != -1 && v->q_presentation_index != -1)
			break;
	}
	if (v->q_graphics_index == -1) {
		fprintf(stderr, "no suitable graphics queue families\n");
		exit(1);
	}
	if (v->q_presentation_index == -1) {
		fprintf(stderr, "no suitable presentation queue families\n");
		exit(1);
	}
	v->graphics_family = list[v->q_graphics_index];
	v->presentation_family = list[v->q_presentation_index];

	float prio = 1.0f;
	VkDeviceQueueCreateInfo queueCreateInfos[] = {
		(VkDeviceQueueCreateInfo) {
			.sType = VK_STRUCTURE_TYPE_DEVICE_QUEUE_CREATE_INFO,
			.queueCount = 1,
			.queueFamilyIndex = v->q_graphics_index,
			.pQueuePriorities = &prio,
		},
		(VkDeviceQueueCreateInfo) {
			.sType = VK_STRUCTURE_TYPE_DEVICE_QUEUE_CREATE_INFO,
			.queueCount = 1,
			.queueFamilyIndex = v->q_presentation_index,
			.pQueuePriorities = &prio,
		},
	};

	const char* extensions[] = {
    VK_KHR_SWAPCHAIN_EXTENSION_NAME
	};

	VkPhysicalDeviceFeatures deviceFeatures = { 0 };
	VkDeviceCreateInfo createInfo = {
		.sType = VK_STRUCTURE_TYPE_DEVICE_CREATE_INFO,
		.queueCreateInfoCount = ARR_LEN(queueCreateInfos),
		.pQueueCreateInfos = queueCreateInfos,
		.pEnabledFeatures = &deviceFeatures,
		.enabledExtensionCount = ARR_LEN(extensions),
		.ppEnabledExtensionNames = extensions,
		.enabledLayerCount = ARR_LEN(enabled_layers),
		.ppEnabledLayerNames = enabled_layers,
	};

	CHECK_VK(vkCreateDevice(v->physical_device, &createInfo, VK_NULL_HANDLE, &v->device));

	vkGetDeviceQueue(v->device, v->q_graphics_index, 0, &v->q_graphics);
	vkGetDeviceQueue(v->device, v->q_presentation_index, 0, &v->q_presentation);
}

void init_swapchain(Vulkan* v, SDL_Window* window) {
	VkSurfaceCapabilitiesKHR capabilities;
	CHECK_VK(vkGetPhysicalDeviceSurfaceCapabilitiesKHR(v->physical_device, v->surface, &capabilities));

	v->num_swaps = CLAMP(capabilities.minImageCount + 1, capabilities.minImageCount, capabilities.maxImageCount);

	VkSurfaceFormatKHR formats[MAX_NUM_SURFACE_FORMATS];
	uint32_t count = ARR_LEN(formats);
	CHECK_VK(vkGetPhysicalDeviceSurfaceFormatsKHR(v->physical_device, v->surface, &count, formats));
	for (int i = 0; i < count; i++) {	
		if (formats[i].format == VK_FORMAT_B8G8R8A8_SRGB && formats[i].colorSpace == VK_COLOR_SPACE_SRGB_NONLINEAR_KHR) {
			v->format = formats[i];
			break;
		}
	}
	if (v->format.format == VK_FORMAT_UNDEFINED) {
		ERR("no valid formats\n");
		exit(1);
	}

	if (capabilities.currentExtent.width == 0xFFFFFFF) {
		// window scales based on image (HiDPI)
		int width, height;
		SDL_Vulkan_GetDrawableSize(window, &width, &height);
		v->extent2d.width  = CLAMP(width,  capabilities.minImageExtent.width,  capabilities.maxImageExtent.width);
		v->extent2d.height = CLAMP(height, capabilities.minImageExtent.height, capabilities.maxImageExtent.height);
	}
	else {
		v->extent2d = capabilities.currentExtent;
	}

	VkSwapchainCreateInfoKHR createInfo = {
		.sType = VK_STRUCTURE_TYPE_SWAPCHAIN_CREATE_INFO_KHR,
		.surface = v->surface,
		.minImageCount = v->num_swaps,
		.imageFormat = v->format.format,
		.imageColorSpace = v->format.colorSpace,
		.imageExtent = v->extent2d,
		.imageArrayLayers = 1,
		.imageUsage = VK_IMAGE_USAGE_COLOR_ATTACHMENT_BIT,
		.imageSharingMode = VK_SHARING_MODE_EXCLUSIVE,
		.preTransform = capabilities.currentTransform,
		.compositeAlpha = VK_COMPOSITE_ALPHA_OPAQUE_BIT_KHR,
		// TODO: try mailbox (power hungry) or immediate (can tear)
		.presentMode = VK_PRESENT_MODE_FIFO_KHR,
		.clipped = VK_TRUE,
	};
	uint32_t indexes[] = { v->q_graphics_index, v->q_presentation_index };
	if (v->q_graphics_index != v->q_presentation_index) {
		LOG("Graphics index %d but presentation index %d", v->q_graphics_index, v->q_presentation_index);
		createInfo.imageSharingMode = VK_SHARING_MODE_CONCURRENT;
		createInfo.queueFamilyIndexCount = 2;
		createInfo.pQueueFamilyIndices = indexes;
	}

	CHECK_VK(vkCreateSwapchainKHR(v->device, &createInfo, VK_NULL_HANDLE, &v->swapchain));
}

void init_image_views(Vulkan* v) {
	vkGetSwapchainImagesKHR(v->device, v->swapchain, &v->num_swaps, v->images);

	for (size_t i = 0; i < v->num_swaps; i++) {
		VkImageViewCreateInfo createInfo = {
			.sType = VK_STRUCTURE_TYPE_IMAGE_VIEW_CREATE_INFO,
			.image = v->images[i],
			.viewType = VK_IMAGE_VIEW_TYPE_2D,
			.format = v->format.format,
			.components.r = VK_COMPONENT_SWIZZLE_IDENTITY,
			.components.g = VK_COMPONENT_SWIZZLE_IDENTITY,
			.components.b = VK_COMPONENT_SWIZZLE_IDENTITY,
			.components.a = VK_COMPONENT_SWIZZLE_IDENTITY,
			.subresourceRange.aspectMask = VK_IMAGE_ASPECT_COLOR_BIT,
			.subresourceRange.baseMipLevel = 0,
			.subresourceRange.levelCount = 1,
			.subresourceRange.baseArrayLayer = 0,
			.subresourceRange.layerCount = 1,
		};

		CHECK_VK(vkCreateImageView(v->device, &createInfo, VK_NULL_HANDLE, &v->image_views[i]));
	}
}

void init_render_pass(Vulkan* v) {
	VkAttachmentDescription colorAttachment = {
		.format = v->format.format,
		.samples = VK_SAMPLE_COUNT_1_BIT,
		.loadOp = VK_ATTACHMENT_LOAD_OP_CLEAR,
		.storeOp = VK_ATTACHMENT_STORE_OP_STORE,
		.stencilLoadOp = VK_ATTACHMENT_LOAD_OP_DONT_CARE,
		.stencilStoreOp = VK_ATTACHMENT_STORE_OP_DONT_CARE,
		.initialLayout = VK_IMAGE_LAYOUT_UNDEFINED,
		.finalLayout = VK_IMAGE_LAYOUT_PRESENT_SRC_KHR,
	};

	VkAttachmentReference colorAttachmentRef = {
		.layout = VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL,
	};

	VkSubpassDescription subpass = {
		.pipelineBindPoint = VK_PIPELINE_BIND_POINT_GRAPHICS,
		.colorAttachmentCount = 1,
		.pColorAttachments = &colorAttachmentRef,
	};

	VkSubpassDependency dependency = {
		.srcSubpass = VK_SUBPASS_EXTERNAL,
		.dstSubpass = 0,
		.srcStageMask = VK_PIPELINE_STAGE_COLOR_ATTACHMENT_OUTPUT_BIT,
		.srcAccessMask = 0,
		.dstStageMask = VK_PIPELINE_STAGE_COLOR_ATTACHMENT_OUTPUT_BIT,
		.dstAccessMask = VK_ACCESS_COLOR_ATTACHMENT_WRITE_BIT,
	};

	VkRenderPassCreateInfo renderPassInfo = {
		.sType = VK_STRUCTURE_TYPE_RENDER_PASS_CREATE_INFO,
		.attachmentCount = 1,
		.pAttachments = &colorAttachment,
		.subpassCount = 1,
		.pSubpasses = &subpass,
		.dependencyCount = 1,
		.pDependencies = &dependency,
	};

	CHECK_VK(vkCreateRenderPass(v->device, &renderPassInfo, VK_NULL_HANDLE, &v->renderpass));
}

void init_pipeline_layout(Vulkan* v) {
	VkDynamicState dynamic_states[] = {
		VK_DYNAMIC_STATE_VIEWPORT
	};
	VkPipelineDynamicStateCreateInfo dynamicState = {
		.sType = VK_STRUCTURE_TYPE_PIPELINE_DYNAMIC_STATE_CREATE_INFO,
		.dynamicStateCount = sizeof(dynamic_states),
		.pDynamicStates = dynamic_states,
	};
	VkPipelineVertexInputStateCreateInfo vertexInputInfo = {
		.sType = VK_STRUCTURE_TYPE_PIPELINE_VERTEX_INPUT_STATE_CREATE_INFO,
	};
	VkViewport viewport = {
		.x = 0.0f,
		.y = 0.0f,
		.width = (float) v->extent2d.width,
		.height = (float) v->extent2d.height,
		.minDepth = 0.0f,
		.maxDepth = 1.0f,
	};
	VkPipelineViewportStateCreateInfo viewportState = {
		.sType = VK_STRUCTURE_TYPE_PIPELINE_VIEWPORT_STATE_CREATE_INFO,
		.viewportCount = 1,
		.pViewports = &viewport,
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
		.blendEnable = VK_TRUE,
		.srcColorBlendFactor = VK_BLEND_FACTOR_SRC_ALPHA,
		.dstColorBlendFactor = VK_BLEND_FACTOR_ONE_MINUS_SRC_ALPHA,
		.colorBlendOp = VK_BLEND_OP_ADD,
		.srcAlphaBlendFactor = VK_BLEND_FACTOR_ONE,
		.dstAlphaBlendFactor = VK_BLEND_FACTOR_ZERO,
		.alphaBlendOp = VK_BLEND_OP_ADD,
	};
	VkPipelineColorBlendStateCreateInfo colorBlending = {
		.sType = VK_STRUCTURE_TYPE_PIPELINE_COLOR_BLEND_STATE_CREATE_INFO,
		.logicOpEnable = VK_FALSE,
		.attachmentCount = 1,
		.pAttachments = &colorBlendAttachment,
	};
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

	CHECK_VK(vkCreatePipelineLayout(v->device, &info, VK_NULL_HANDLE, &v->pipeline_layout));
}

VkShaderModule create_shader(VkDevice device, const char* exec_path, const char* shader_name) {
	string abspath = string_init(exec_path);
	string_catc(&abspath, SHADER_PATH);
	string_catc(&abspath, shader_name);

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
	CHECK_VK(vkCreateShaderModule(device, &createInfo, VK_NULL_HANDLE, &res));

	return res;
}

void init_pipeline(Vulkan* v, const char* exec_path) {
	VkShaderModule vert_shader = create_shader(v->device, exec_path, "triangle.vert.spv");
	VkShaderModule frag_shader = create_shader(v->device, exec_path, "triangle.frag.spv");
	VkPipelineShaderStageCreateInfo vertShaderStageInfo = {
		.sType = VK_STRUCTURE_TYPE_PIPELINE_SHADER_STAGE_CREATE_INFO,
		.stage = VK_SHADER_STAGE_VERTEX_BIT,
		.module = vert_shader,
		.pName = "main",
	};
	VkPipelineShaderStageCreateInfo fragShaderStageInfo = {
		.sType = VK_STRUCTURE_TYPE_PIPELINE_SHADER_STAGE_CREATE_INFO,
		.stage = VK_SHADER_STAGE_FRAGMENT_BIT,
		.module = frag_shader,
		.pName = "main",
	};
	VkPipelineShaderStageCreateInfo shaderStages[] = {vertShaderStageInfo, fragShaderStageInfo};

	VkAttachmentDescription colorAttachment = {
		.format = v->format.format,
		.samples = VK_SAMPLE_COUNT_1_BIT,
		.loadOp = VK_ATTACHMENT_LOAD_OP_CLEAR,
		.storeOp = VK_ATTACHMENT_STORE_OP_STORE,
		.stencilLoadOp = VK_ATTACHMENT_LOAD_OP_DONT_CARE,
		.stencilStoreOp = VK_ATTACHMENT_STORE_OP_DONT_CARE,
		.initialLayout = VK_IMAGE_LAYOUT_UNDEFINED,
		.finalLayout = VK_IMAGE_LAYOUT_PRESENT_SRC_KHR,
	};
	VkPipelineVertexInputStateCreateInfo vertexInputInfo = {
		.sType = VK_STRUCTURE_TYPE_PIPELINE_VERTEX_INPUT_STATE_CREATE_INFO,
		.vertexBindingDescriptionCount = 0,
		.vertexAttributeDescriptionCount = 0,
	};

	VkPipelineInputAssemblyStateCreateInfo inputAssembly = {
		.sType = VK_STRUCTURE_TYPE_PIPELINE_INPUT_ASSEMBLY_STATE_CREATE_INFO,
		.topology = VK_PRIMITIVE_TOPOLOGY_TRIANGLE_STRIP,
		.primitiveRestartEnable = VK_FALSE,
	};

	VkPipelineViewportStateCreateInfo viewportState = {
		.sType = VK_STRUCTURE_TYPE_PIPELINE_VIEWPORT_STATE_CREATE_INFO,
		.viewportCount = 1,
		.scissorCount = 1,
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
		.blendEnable = VK_FALSE,
	};
	VkPipelineColorBlendStateCreateInfo colorBlending = {
		.sType = VK_STRUCTURE_TYPE_PIPELINE_COLOR_BLEND_STATE_CREATE_INFO,
		.logicOpEnable = VK_FALSE,
		.logicOp = VK_LOGIC_OP_COPY,
		.attachmentCount = 1,
		.pAttachments = &colorBlendAttachment,
		.blendConstants[0] = 0.0f,
		.blendConstants[1] = 0.0f,
		.blendConstants[2] = 0.0f,
		.blendConstants[3] = 0.0f,
	};
	VkDynamicState dynamicStates[] = {
		VK_DYNAMIC_STATE_VIEWPORT,
		VK_DYNAMIC_STATE_SCISSOR,
	};
	VkPipelineDynamicStateCreateInfo dynamicState ={
		.sType = VK_STRUCTURE_TYPE_PIPELINE_DYNAMIC_STATE_CREATE_INFO,
		.dynamicStateCount = ARR_LEN(dynamicStates),
		.pDynamicStates = dynamicStates,
	};
	VkPipelineLayoutCreateInfo pipelineLayoutInfo = {
		.sType = VK_STRUCTURE_TYPE_PIPELINE_LAYOUT_CREATE_INFO,
		.setLayoutCount = 0,
		.pushConstantRangeCount = 0,
	};
	CHECK_VK(vkCreatePipelineLayout(v->device, &pipelineLayoutInfo, VK_NULL_HANDLE, &v->pipeline_layout));

	VkGraphicsPipelineCreateInfo pipelineInfo = {
		.sType = VK_STRUCTURE_TYPE_GRAPHICS_PIPELINE_CREATE_INFO,
		.stageCount = 2,
		.pStages = shaderStages,
		.pVertexInputState = &vertexInputInfo,
		.pInputAssemblyState = &inputAssembly,
		.pViewportState = &viewportState,
		.pRasterizationState = &rasterizer,
		.pMultisampleState = &multisampling,
		.pColorBlendState = &colorBlending,
		.pDynamicState = &dynamicState,
		.layout = v->pipeline_layout,
		.renderPass = v->renderpass,
		.subpass = 0,
		.basePipelineHandle = VK_NULL_HANDLE,
	};
	CHECK_VK(vkCreateGraphicsPipelines(v->device, VK_NULL_HANDLE, 1, &pipelineInfo, VK_NULL_HANDLE, &v->pipeline));

	vkDestroyShaderModule(v->device, frag_shader, VK_NULL_HANDLE);
	vkDestroyShaderModule(v->device, vert_shader, VK_NULL_HANDLE);
}

void init_framebuffers(Vulkan* v) {
	for (size_t i = 0; i < v->num_swaps; i++) {
		VkImageView attachments[] = {
			v->image_views[i]
		};

		VkFramebufferCreateInfo framebufferInfo = {
			.sType = VK_STRUCTURE_TYPE_FRAMEBUFFER_CREATE_INFO,
			.renderPass = v->renderpass,
			.attachmentCount = 1,
			.pAttachments = attachments,
			.width = v->extent2d.width,
			.height = v->extent2d.height,
			.layers = 1,
		};

		CHECK_VK(vkCreateFramebuffer(v->device, &framebufferInfo, VK_NULL_HANDLE, &v->framebuffers[i]));
	}
}

void init_command_pool(Vulkan* v) {
	VkCommandPoolCreateInfo poolInfo = {
		.sType = VK_STRUCTURE_TYPE_COMMAND_POOL_CREATE_INFO,
		.flags = VK_COMMAND_POOL_CREATE_RESET_COMMAND_BUFFER_BIT,
		.queueFamilyIndex = v->q_graphics_index,
	};
	CHECK_VK(vkCreateCommandPool(v->device, &poolInfo, VK_NULL_HANDLE, &v->command_pool));
}

void init_command_buffer(Vulkan* v) {
	VkCommandBufferAllocateInfo allocInfo = {
		.sType = VK_STRUCTURE_TYPE_COMMAND_BUFFER_ALLOCATE_INFO,
		.commandPool = v->command_pool,
		.level = VK_COMMAND_BUFFER_LEVEL_PRIMARY,
		.commandBufferCount = 1,
	};
	CHECK_VK(vkAllocateCommandBuffers(v->device, &allocInfo, &v->command_buffer));
}

void init_sync(Vulkan* v) {
	VkSemaphoreCreateInfo semaphoreInfo = {
		.sType = VK_STRUCTURE_TYPE_SEMAPHORE_CREATE_INFO
	};

	VkFenceCreateInfo fenceInfo = {
		.sType = VK_STRUCTURE_TYPE_FENCE_CREATE_INFO,
		.flags = VK_FENCE_CREATE_SIGNALED_BIT,
	};

	CHECK_VK(vkCreateSemaphore(v->device, &semaphoreInfo, VK_NULL_HANDLE, &v->sem_image_ready));
	CHECK_VK(vkCreateSemaphore(v->device, &semaphoreInfo, VK_NULL_HANDLE, &v->sem_render_done));
	CHECK_VK(vkCreateFence(v->device, &fenceInfo, VK_NULL_HANDLE, &v->fence));
}

void recordCommandBuffer(Vulkan *v, VkCommandBuffer commandBuffer, uint32_t imageIndex, mat4* mvp) {
	VkCommandBufferBeginInfo beginInfo = {
		.sType = VK_STRUCTURE_TYPE_COMMAND_BUFFER_BEGIN_INFO,
	};

	CHECK_VK(vkBeginCommandBuffer(commandBuffer, &beginInfo));

	VkClearValue clearColor = {{{0.2, 0.3, 0.3, 1.0}}};
	VkRenderPassBeginInfo renderPassInfo = {
		.sType = VK_STRUCTURE_TYPE_RENDER_PASS_BEGIN_INFO,
		.renderPass = v->renderpass,
		.framebuffer = v->framebuffers[imageIndex],
		.renderArea.offset = {0, 0},
		.renderArea.extent = v->extent2d,
		.clearValueCount = 1,
		.pClearValues = &clearColor,
	};

	vkCmdBeginRenderPass(commandBuffer, &renderPassInfo, VK_SUBPASS_CONTENTS_INLINE);
	vkCmdBindPipeline(commandBuffer, VK_PIPELINE_BIND_POINT_GRAPHICS, v->pipeline);

	VkViewport viewport = {
		.x = 0.0f,
		.y = 0.0f,
		.width = (float) v->extent2d.width,
		.height = (float) v->extent2d.height,
		.minDepth = 0.0f,
		.maxDepth = 1.0f,
	};
	vkCmdSetViewport(commandBuffer, 0, 1, &viewport);

	VkRect2D scissor = {
		.offset = {0, 0},
		.extent = v->extent2d,
	};
	vkCmdSetScissor(commandBuffer, 0, 1, &scissor);

  vkCmdPushConstants(commandBuffer, v->pipeline_layout, VK_SHADER_STAGE_VERTEX_BIT, 0, sizeof(mat4), mvp);
	vkCmdBindIndexBuffer(commandBuffer, v->index_buffer, 0, VK_INDEX_TYPE_UINT16);
	vkCmdDrawIndexed(commandBuffer, ARR_LEN(indices), 1, 0, 0, 0);

	vkCmdEndRenderPass(commandBuffer);

	CHECK_VK(vkEndCommandBuffer(commandBuffer));
}

void draw(Vulkan* v, mat4* mvp) {
	vkWaitForFences(v->device, 1, &v->fence, VK_TRUE, UINT64_MAX);
	vkResetFences(v->device, 1, &v->fence);

	uint32_t imageIndex;
	vkAcquireNextImageKHR(v->device, v->swapchain, UINT64_MAX, v->sem_image_ready, VK_NULL_HANDLE, &imageIndex);

	vkResetCommandBuffer(v->command_buffer, 0);
	recordCommandBuffer(v, v->command_buffer, imageIndex, mvp);

	VkSemaphore waitSemaphores[] = {v->sem_image_ready};
	VkPipelineStageFlags waitStages[] = {VK_PIPELINE_STAGE_COLOR_ATTACHMENT_OUTPUT_BIT};
	VkSemaphore signalSemaphores[] = {v->sem_render_done};
	VkSubmitInfo submitInfo = {
		.sType = VK_STRUCTURE_TYPE_SUBMIT_INFO,
		.waitSemaphoreCount = 1,
		.pWaitSemaphores = waitSemaphores,
		.pWaitDstStageMask = waitStages,
		.commandBufferCount = 1,
		.pCommandBuffers = &v->command_buffer,
		.signalSemaphoreCount = 1,
		.pSignalSemaphores = signalSemaphores,
	};

	CHECK_VK(vkQueueSubmit(v->q_graphics, 1, &submitInfo, v->fence));

	VkSwapchainKHR swapChains[] = {v->swapchain};
	VkPresentInfoKHR presentInfo = {
		.sType = VK_STRUCTURE_TYPE_PRESENT_INFO_KHR,
		.waitSemaphoreCount = 1,
		.pWaitSemaphores = signalSemaphores,
		.swapchainCount = 1,
		.pSwapchains = swapChains,
		.pImageIndices = &imageIndex,
	};

	vkQueuePresentKHR(v->q_presentation, &presentInfo);
}

uint32_t findMemoryType(Vulkan* v, uint32_t typeFilter, VkMemoryPropertyFlags properties) {
	VkPhysicalDeviceMemoryProperties memProperties;
	vkGetPhysicalDeviceMemoryProperties(v->physical_device, &memProperties);

	for (uint32_t i = 0; i < memProperties.memoryTypeCount; i++) {
		if ((typeFilter & (1 << i)) && (memProperties.memoryTypes[i].propertyFlags & properties) == properties) {
			return i;
		}
	}

	ERR("failed to find suitable memory type for %d", typeFilter);
	exit(1);
}

void createBuffer(Vulkan* v, VkDeviceSize size, VkBufferUsageFlags usage, VkMemoryPropertyFlags properties, VkBuffer* res, VkDeviceMemory* bufferMemory) {
	VkBufferCreateInfo bufferInfo = {
		.sType = VK_STRUCTURE_TYPE_BUFFER_CREATE_INFO,
		.size = size,
		.usage = usage,
		.sharingMode = VK_SHARING_MODE_EXCLUSIVE,
	};

	CHECK_VK(vkCreateBuffer(v->device, &bufferInfo, VK_NULL_HANDLE, res));

	VkMemoryRequirements memRequirements;
	vkGetBufferMemoryRequirements(v->device, *res, &memRequirements);

	VkMemoryAllocateInfo allocInfo = {
		.sType = VK_STRUCTURE_TYPE_MEMORY_ALLOCATE_INFO,
		.allocationSize = memRequirements.size,
		.memoryTypeIndex = findMemoryType(v, memRequirements.memoryTypeBits, properties),
	};

	CHECK_VK(vkAllocateMemory(v->device, &allocInfo, VK_NULL_HANDLE, bufferMemory));

	CHECK_VK(vkBindBufferMemory(v->device, *res, *bufferMemory, 0));
}


void copyBuffer(Vulkan* v, VkBuffer srcBuffer, VkBuffer dstBuffer, VkDeviceSize size) {
	VkCommandBufferAllocateInfo allocInfo = {
		.sType = VK_STRUCTURE_TYPE_COMMAND_BUFFER_ALLOCATE_INFO,
		.level = VK_COMMAND_BUFFER_LEVEL_PRIMARY,
		.commandPool = v->command_pool,
		.commandBufferCount = 1,
	};

	VkCommandBuffer commandBuffer;
	vkAllocateCommandBuffers(v->device, &allocInfo, &commandBuffer);

	VkCommandBufferBeginInfo beginInfo = {
		.sType = VK_STRUCTURE_TYPE_COMMAND_BUFFER_BEGIN_INFO,
		.flags = VK_COMMAND_BUFFER_USAGE_ONE_TIME_SUBMIT_BIT,
	};

	vkBeginCommandBuffer(commandBuffer, &beginInfo);

	VkBufferCopy copyRegion = {
		.size = size
	};
	vkCmdCopyBuffer(commandBuffer, srcBuffer, dstBuffer, 1, &copyRegion);

	vkEndCommandBuffer(commandBuffer);

	VkSubmitInfo submitInfo = {
		.sType = VK_STRUCTURE_TYPE_SUBMIT_INFO,
		.commandBufferCount = 1,
		.pCommandBuffers = &commandBuffer,
	};

	vkQueueSubmit(v->q_graphics, 1, &submitInfo, VK_NULL_HANDLE);
	vkQueueWaitIdle(v->q_graphics);

	vkFreeCommandBuffers(v->device, v->command_pool, 1, &commandBuffer);
}

void init_buffers(Vulkan* v) {
	VkDeviceMemory indexBufferMemory;

	VkDeviceSize bufferSize = ARR_LEN(indices) * sizeof(indices[0]);

	VkBuffer stagingBuffer;
	VkDeviceMemory stagingBufferMemory;
	createBuffer(v, bufferSize, VK_BUFFER_USAGE_TRANSFER_SRC_BIT, VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT | VK_MEMORY_PROPERTY_HOST_COHERENT_BIT, &stagingBuffer, &stagingBufferMemory);

	void* data;
	vkMapMemory(v->device, stagingBufferMemory, 0, bufferSize, 0, &data);
	memcpy(data, indices, (size_t) bufferSize);
	vkUnmapMemory(v->device, stagingBufferMemory);

	createBuffer(v, bufferSize, VK_BUFFER_USAGE_TRANSFER_DST_BIT | VK_BUFFER_USAGE_INDEX_BUFFER_BIT, VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT, &v->index_buffer, &indexBufferMemory);

	copyBuffer(v, stagingBuffer, v->index_buffer, bufferSize);

	vkDestroyBuffer(v->device, stagingBuffer, VK_NULL_HANDLE);
	vkFreeMemory(v->device, stagingBufferMemory, VK_NULL_HANDLE);
}

Vulkan create_vulkan(SDL_Window* window, const char* exec_path) {
	const char* name = SDL_GetWindowTitle(window);
	LOG("[%s] Initializing vulkan", name);
	Vulkan res = {
		.q_graphics_index = -1,
		.q_presentation_index = -1
	};
	LOG("[%s vulkan] Creating instance", name);
	init_instance(&res, window);
#ifdef DEBUG
	LOG("[%s vulkan] Registering debug callback", name);
	init_debug(&res);
#endif
	LOG("[%s vulkan] Initializing surface", name);
	init_surface(&res, window);
	LOG("[%s vulkan] Initializing physical device", name);
	init_physical_device(&res);
	LOG("[%s vulkan] Initializing device", name);
	init_device(&res);
	LOG("[%s vulkan] Initializing swapchain", name);
	init_swapchain(&res, window);
	LOG("[%s vulkan] Initializing image views", name);
	init_image_views(&res);
	LOG("[%s vulkan] Initializing render pass", name);
	init_render_pass(&res);
	LOG("[%s vulkan] Initializing pipeline layout", name);
	init_pipeline_layout(&res);
	LOG("[%s vulkan] Initializing pipeline", name);
	init_pipeline(&res, exec_path);
	LOG("[%s vulkan] Initializing framebuffers", name);
	init_framebuffers(&res);
	LOG("[%s vulkan] Initializing command pool", name);
	init_command_pool(&res);
	LOG("[%s vulkan] Initializing command buffer", name);
	init_command_buffer(&res);
	LOG("[%s vulkan] Initializing synchronization primitives", name);
	init_sync(&res);
	LOG("[%s vulkan] Initializing buffers", name);
	init_buffers(&res);

	return res;
}

void destroy_vulkan(Vulkan* v, SDL_Window* window) {
	vkDeviceWaitIdle(v->device);
	vkDestroyBuffer(v->device, v->index_buffer, VK_NULL_HANDLE);
	vkFreeMemory(v->device, v->index_buffer_mem, VK_NULL_HANDLE);
	vkDestroySemaphore(v->device, v->sem_image_ready, VK_NULL_HANDLE);
	vkDestroySemaphore(v->device, v->sem_render_done, VK_NULL_HANDLE);
	vkDestroyFence(v->device, v->fence, VK_NULL_HANDLE);
	vkDestroyCommandPool(v->device, v->command_pool, VK_NULL_HANDLE);

	for (size_t i = 0; i < v->num_swaps; i++)
		vkDestroyFramebuffer(v->device, v->framebuffers[i], VK_NULL_HANDLE);

	vkDestroyPipeline(v->device, v->pipeline, VK_NULL_HANDLE);
	vkDestroyPipelineLayout(v->device, v->pipeline_layout, VK_NULL_HANDLE);
	vkDestroyRenderPass(v->device, v->renderpass, VK_NULL_HANDLE);

	for (size_t i = 0; i < v->num_swaps; i++)
		vkDestroyImageView(v->device, v->image_views[i], VK_NULL_HANDLE);

	vkDestroySwapchainKHR(v->device, v->swapchain, VK_NULL_HANDLE);
	vkDestroyDevice(v->device, VK_NULL_HANDLE);

	PFN_vkDestroyDebugUtilsMessengerEXT func = (PFN_vkDestroyDebugUtilsMessengerEXT) vkGetInstanceProcAddr(v->instance, "vkDestroyDebugUtilsMessengerEXT");
	if (func != NULL) {
		func(v->instance, v->debug_messenger, VK_NULL_HANDLE);
	} else {
		const char* name = SDL_GetWindowTitle(window);
		ERR("[%s vulkan] Couldn't cleanup v->debug_messenger", name);
	}

	vkDestroySurfaceKHR(v->instance, v->surface, VK_NULL_HANDLE);
	vkDestroyInstance(v->instance, VK_NULL_HANDLE);
}