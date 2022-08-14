#pragma once
#include "error.h"

static inline void* jdalloc(size_t size) {
	void* res = malloc(size);
	CHECK_JEDI(res == NULL);
	return res;
}

static inline void jdfree(void* ptr) {
	free(ptr);
}
