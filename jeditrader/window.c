#include <GL/glew.h>
#include <stdio.h>
#include <string.h>

#include "window.h"

void window_resize(Window* window, int width, int height) {
	printf("resize: %dx%d\n", width, height);
	window->width = width;
	window->height = height;
	window->aspect_ratio = (double)width / (double)height;

	if (window->chart != NULL) {
		window->chart->width = width;
		window->chart->height = height;
		window->chart->aspect_ratio = window->aspect_ratio;
		chart_resize(window->chart);
	}
	glViewport(0, 0, width, height);
}

static void error_callback_gl(
 GLenum source,
 GLenum type,
 GLuint id,
 GLenum severity,
 GLsizei length,
 const GLchar* msg,
 const void* data) {
	char* src;
	char* typ;
	char* sev;

	switch (source) {
	case GL_DEBUG_SOURCE_API:
		src = "API";
		break;

	case GL_DEBUG_SOURCE_WINDOW_SYSTEM:
		src = "WINDOW SYSTEM";
		break;

	case GL_DEBUG_SOURCE_SHADER_COMPILER:
		src = "SHADER COMPILER";
		break;

	case GL_DEBUG_SOURCE_THIRD_PARTY:
		src = "THIRD PARTY";
		break;

	case GL_DEBUG_SOURCE_APPLICATION:
		src = "APPLICATION";
		break;

	case GL_DEBUG_SOURCE_OTHER:
		src = "OTHER";
		break;

	default:
		src = "UNKNOWN";
		break;
	}

	switch (type) {
	case GL_DEBUG_TYPE_ERROR:
		typ = "ERROR";
		break;

	case GL_DEBUG_TYPE_DEPRECATED_BEHAVIOR:
		typ = "DEPRECATED BEHAVIOR";
		break;

	case GL_DEBUG_TYPE_UNDEFINED_BEHAVIOR:
		typ = "UDEFINED BEHAVIOR";
		break;

	case GL_DEBUG_TYPE_PORTABILITY:
		typ = "PORTABILITY";
		break;

	case GL_DEBUG_TYPE_PERFORMANCE:
		typ = "PERFORMANCE";
		break;

	case GL_DEBUG_TYPE_OTHER:
		typ = "OTHER";
		break;

	case GL_DEBUG_TYPE_MARKER:
		typ = "MARKER";
		break;

	default:
		typ = "UNKNOWN";
		break;
	}

	switch (severity) {
	case GL_DEBUG_SEVERITY_HIGH:
		sev = "HIGH";
		break;

	case GL_DEBUG_SEVERITY_MEDIUM:
		sev = "MEDIUM";
		break;

	case GL_DEBUG_SEVERITY_LOW:
		sev = "LOW";
		break;

	case GL_DEBUG_SEVERITY_NOTIFICATION:
		sev = "NOTIFICATION";
		break;

	default:
		sev = "UNKNOWN";
		break;
	}

	printf("GL[%d %s %s %s]: %s\n", id, sev, typ, src, msg);
}

int window_init(Window* window, char* title) {
	SDL_GL_SetAttribute(SDL_GL_DEPTH_SIZE, 16);
	SDL_GL_SetAttribute(SDL_GL_DOUBLEBUFFER, 1);
	// 4.1 is July 26, 2010 and last version OSX supports
	SDL_GL_SetAttribute(SDL_GL_CONTEXT_MAJOR_VERSION, 4);
	SDL_GL_SetAttribute(SDL_GL_CONTEXT_MINOR_VERSION, 1);

	window->width = 1920;
	window->height = 1080;
	window->aspect_ratio = (double)window->width / (double)window->height;
	int flags = SDL_WINDOW_OPENGL;
	window->window = SDL_CreateWindow(
	 title,
	 SDL_WINDOWPOS_UNDEFINED,
	 SDL_WINDOWPOS_UNDEFINED,
	 window->width,
	 window->height,
	 flags);
	if (!window->window) {
		printf("[%s] SDL_CreateWindow failed: %s\n", title, SDL_GetError());
		return -1;
	}
	if (SDL_GL_CreateContext(window->window) == NULL) {
		printf("[%s] SDL_CreateContext failed: %s\n", title, SDL_GetError());
		return -1;
	}
	glewExperimental = GL_TRUE;
	int err = glewInit();
	if (err != 0) {
		printf("[%s] glewInit() failed with code %d\n", title, err);
		return -1;
	}
	printf("[%s] Registering error_callback_gl\n", title);
	glEnable(GL_DEBUG_OUTPUT);
	glDebugMessageCallback(error_callback_gl, NULL);

	printf("[%s] Renderer: %s\n", title, glGetString(GL_RENDERER));
	printf(
	 "[%s] OpenGL version supported: %s\n", title, glGetString(GL_VERSION));

	memset(window->keyboard_last, 0, sizeof(window->keyboard_last));
	memset(window->keyboard_cur, 0, sizeof(window->keyboard_cur));
	memset(window->mouse_last, 0, sizeof(window->mouse_last));
	memset(window->mouse_cur, 0, sizeof(window->mouse_cur));

	return 0;
}

void window_update(Window* window) {
	size_t num_keys = sizeof(window->keyboard_cur);
	memcpy(window->keyboard_last, window->keyboard_cur, num_keys);

	size_t num_mouse_buttons = sizeof(window->mouse_cur);
	memcpy(window->mouse_last, window->mouse_cur, num_mouse_buttons);
}

void window_event(Window* window, SDL_Event* e) {
	int key;
	switch (e->type) {
	case SDL_KEYDOWN:
		key = e->key.keysym.sym;
		if (key < sizeof(window->keyboard_cur)) {
			window->keyboard_cur[key] = 1;
		}
		break;
	case SDL_KEYUP:
		key = e->key.keysym.sym;
		if (key < sizeof(window->keyboard_cur)) {
			window->keyboard_cur[key] = 0;
		}
		break;
	case SDL_MOUSEBUTTONDOWN:
		key = e->button.button;
		if (key < sizeof(window->keyboard_cur)) {
			window->mouse_cur[key] = 1;
		}
		break;
	case SDL_MOUSEBUTTONUP:
		key = e->button.button;
		if (key < sizeof(window->keyboard_cur)) {
			window->mouse_cur[key] = 0;
		}
		break;
	case SDL_WINDOWEVENT_RESIZED:
	case SDL_WINDOWEVENT_SIZE_CHANGED:
		window_resize(window, e->window.data1, e->window.data2);
		break;
	case SDL_MOUSEMOTION:
		window->mouse_x = e->motion.x;
		window->mouse_y = e->motion.y;
		break;
	default:
		break;
	}
}
