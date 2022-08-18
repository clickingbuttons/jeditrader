#include "cube.h"

#include "error.h"
#include "pipeline.h"

static const uint16_t indices[] = {3, 2, 6, 7, 4, 2, 0, 3, 1, 6, 5, 4, 1, 0};
static VkBuffer index_buffer;
static VkDeviceMemory index_buffer_mem;

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
	vkCmdBindIndexBuffer(b, index_buffer, 0, VK_INDEX_TYPE_UINT16);
	vkCmdDrawIndexed(b, ARR_LEN(indices), 1, 0, 0, 0);
}

void register_cube_pipeline(Vulkan* v, Cam* c) {
	Pipeline cube = pipeline_default(v, VK_PRIMITIVE_TOPOLOGY_TRIANGLE_STRIP, "cube");
	cube.draw_fn = pipeline_draw;
	cube.data = c;
	vec_push(v->pipelines, cube);

	VkDeviceSize bufferSize = sizeof(indices);

	VkBuffer stagingBuffer;
	VkDeviceMemory stagingBufferMemory;
	createBuffer(v, bufferSize, VK_BUFFER_USAGE_TRANSFER_SRC_BIT, VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT | VK_MEMORY_PROPERTY_HOST_COHERENT_BIT, &stagingBuffer, &stagingBufferMemory);

	void* data;
	vkMapMemory(v->device, stagingBufferMemory, 0, bufferSize, 0, &data);
	memcpy(data, indices, (size_t) bufferSize);
	vkUnmapMemory(v->device, stagingBufferMemory);

	createBuffer(v, bufferSize, VK_BUFFER_USAGE_TRANSFER_DST_BIT | VK_BUFFER_USAGE_INDEX_BUFFER_BIT, VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT, &index_buffer, &index_buffer_mem);

	copyBuffer(v, stagingBuffer, index_buffer, bufferSize);

	vkDestroyBuffer(v->device, stagingBuffer, VK_NULL_HANDLE);
	vkFreeMemory(v->device, stagingBufferMemory, VK_NULL_HANDLE);
}

void destroy_cube_pipeline(VkDevice d) {
	vkDestroyBuffer(d, index_buffer, VK_NULL_HANDLE);
	vkFreeMemory(d, index_buffer_mem, VK_NULL_HANDLE);
}
