#pragma once

#include "inttypes.h"
#include "string.h"
#include <stdlib.h>
#include <string.h>

#define VEC_DEFAULT_CAPACITY 8

#define vec_t(T)                                                               \
	struct {                                                                   \
		T* data;                                                               \
		size_t len;                                                            \
		size_t cap;                                                            \
	}

// vec_i64 my_vec = { 0 };
typedef vec_t(int8_t) vec_i8;
typedef vec_t(int16_t) vec_i16;
typedef vec_t(int32_t) vec_i32;
typedef vec_t(int64_t) vec_i64;
typedef vec_t(uint8_t) vec_u8;
typedef vec_t(uint16_t) vec_u16;
typedef vec_t(uint32_t) vec_u32;
typedef vec_t(uint64_t) vec_u64;
typedef vec_t(float) vec_f32;
typedef vec_t(double) vec_f64;
typedef vec_t(string) vec_string;

#define vec_resize(v, nmemb)                                                   \
	{                                                                          \
		(v)->data = realloc((v)->data, nmemb * sizeof(*(v)->data));            \
		(v)->cap = nmemb;                                                      \
	}

#define vec_push_ptr(v, ptr)                                                   \
	{                                                                          \
		if ((v)->len + 1 > (v)->cap) {                                         \
			if ((v)->cap == 0) {                                               \
				vec_resize((v), VEC_DEFAULT_CAPACITY);                         \
			} else {                                                           \
				vec_resize((v), (v)->cap * 2);                                 \
			}                                                                  \
		}                                                                      \
		memcpy((v)->data + (v)->len, ptr, sizeof(*(v)->data));                 \
		(v)->len += 1;                                                         \
	}

#define vec_push(v, val)                                                       \
	{                                                                          \
		typeof(*((v).data)) tmp = (val);                                       \
		vec_push_ptr(&(v), &tmp);                                              \
	}

#define vec_free(v)                                                            \
	{                                                                          \
		free((v)->data);                                                       \
		(v)->data = NULL;                                                      \
	}

// see vecmmap.h
#define for_each(i, c)                                                         \
	for (typeof((c).data) i = (c).data; i < (c).data + (c).len; i++)

#ifdef TEST_VEC
#include <stdio.h>
int main(void) {
	vec_i8 v = {0};
	vec_push(v, 1);
	i32 a = 2;
	vec_push_ptr(&v, &a);
	for (i8 i = 3; i < 10; i++) {
		vec_push(v, i);
	}
	for_each(i, v) { printf("%d\n", *i); }
}
#endif
