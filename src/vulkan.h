#pragma once

#include "linalg.h"
#include "pipeline.h"
#include "vec.h"

#include <SDL2/SDL.h>
#include <vulkan/vulkan.h>

#define MAX_DEVICES 16
#define MAX_EXTENSIONS 256
#define MAX_QUEUE_FAMILIES 256
#define MAX_NUM_SURFACE_FORMATS 256
#define MAX_NUM_SWAPS 4

#define ARR_LEN(arr) sizeof(arr)/sizeof(arr[0])


typedef vec_t(Pipeline) vec_pipeline;

typedef struct Vulkan {
	const char* exec_path;
	vec_pipeline pipelines;	

	VkInstance instance;
	VkDebugUtilsMessengerEXT debug_messenger;
	VkSurfaceKHR surface;

	VkPhysicalDevice physical_device;
	VkDevice device;

	VkQueueFamilyProperties graphics_family;
	VkQueueFamilyProperties presentation_family;

	uint32_t q_graphics_index;
	VkQueue q_graphics;
	uint32_t q_presentation_index;
	VkQueue q_presentation;

	uint32_t num_swaps;
	VkSwapchainKHR swapchain;
	VkImage images[MAX_NUM_SWAPS];
	VkSurfaceFormatKHR format;
	VkExtent2D extent2d;
	VkImageView image_views[MAX_NUM_SWAPS];
	VkFramebuffer framebuffers[MAX_NUM_SWAPS];

	VkRenderPass renderpass;

	VkCommandPool command_pool;
	VkCommandBuffer command_buffer;

	VkSemaphore sem_image_ready;
	VkSemaphore sem_render_done;
	VkFence fence;
} Vulkan;

Vulkan create_vulkan(SDL_Window* window, const char* exec_path);
void draw(Vulkan* v, SDL_Window* window);
void resize(Vulkan* v, SDL_Window* window);
void destroy_vulkan(Vulkan* v, SDL_Window* window);
