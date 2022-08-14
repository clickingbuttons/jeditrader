#pragma once

#include <SDL2/SDL.h>
#ifndef _GNU_SOURCE
#define _GNU_SOURCE
#endif
#include <errno.h>

static char ERR[8096];

#define SETERR(...) snprintf(ERR, sizeof(ERR), __VA_ARGS__)
#define PRINT_LINENO() fprintf(stderr, "%s:%d ", __FILE__, __LINE__)

#define ERR(...)                                                          \
	{                                                                          \
		SETERR(__VA_ARGS__);                                               \
		PRINT_LINENO();                                                    \
		fprintf(stderr, "%s\n", ERR);                                  \
	}
#define ERR_SYS(...)                                                      \
	{                                                                          \
		SETERR(__VA_ARGS__);                                               \
		PRINT_LINENO();                                                    \
		fprintf(stderr, "%s: %s\n", ERR, strerror(errno));             \
	}
#define LOG(...) ERR(__VA_ARGS__);
#define CHECK_SDL(expr) if (expr) { \
	fprintf(stderr, #expr " failed: %s\n", SDL_GetError()); \
	exit(1); \
}
#define CHECK_VK(expr) if (expr) { \
	fprintf(stderr, #expr " failed: %d\n", expr); \
	exit(1); \
}
#define CHECK_JEDI(expr) if (expr) { \
	fprintf(stderr, #expr " failed: %d\n", expr); \
	exit(1); \
}
