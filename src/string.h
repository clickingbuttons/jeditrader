#pragma once
#include "inttypes.h"
#include <stdarg.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// Thanks izabera: https://github.com/izabera/s/blob/master/LICENSE

// allow strings up to 15 bytes to stay on the stack
typedef union string {
	char _data[16];

	struct {
		uint8_t filler1[15], space_left : 4,
		 // use the last byte as a null terminator and to store flags
		 is_pointer : 1, flag1 : 1, flag2 : 1, flag3 : 1;
	};

	// heap allocated
	struct {
		char* ptr;
		// supports strings up to 2^54 -1 bytes
		size_t _size : 54,
		 // capacity is always a power of 2 -1
		 capacity : 6;
		// leave last 4 bits alone
	};
} string;

static inline int ilog2(int n) { return 32 - __builtin_clz(n) - 1; }

static string string_initn(const char* s, size_t size) {
	string res = {0};

	if (size > 15) {
		res.capacity = ilog2(size) + 1;
		res._size = size;
		res.is_pointer = 1;
		res.ptr = (char*)malloc((size_t)1 << res.capacity);
		memcpy(res.ptr, s, size);
		res.ptr[size] = '\0';
	} else {
		memcpy(res._data, s, size);
		res.space_left = 15 - size;
	}

	return res;
}

#define string_empty                                                           \
	(string) { .space_left = 15 }

static string string_init(const char* s) { return string_initn(s, strlen(s)); }

static void string_free(string* s) {
	if (s->is_pointer)
		free(s->ptr);
}

static char* string_data(const string* s) {
	return s->is_pointer ? s->ptr : (char*)s->_data;
}

// Because typing "&" is annoying
#define sdata(s) string_data(&s)

static size_t string_len(const string* s) {
	return s->is_pointer ? s->_size : 15 - s->space_left;
}

// Because typing "&" is annoying
#define slen(s) string_len(&s)

static size_t string_cap(const string* s) {
	return s->is_pointer ? ((size_t)1 << s->capacity) - 1 : 15;
}

static void string_grow(string* s, size_t len) {
	if (len <= string_cap(s))
		return;
	len = ilog2(len) + 1;
	if (s->is_pointer)
		s->ptr = (char*)realloc(s->ptr, (size_t)1 << len);
	else {
		char buf[16];
		memcpy(buf, s->_data, 16);
		s->ptr = (char*)malloc((size_t)1 << len);
		memcpy(s->ptr, buf, 16);
	}
	s->is_pointer = 1;
	s->capacity = len;
}

static void string_catn(string* a, const char* b, size_t sizeb) {
	size_t sizea = string_len(a);
	if (sizea + sizeb > 15) {
		if (string_cap(a) < sizea + sizeb + 1)
			string_grow(a, sizea + sizeb + 1);
		memcpy(a->ptr + sizea, b, sizeb);
		a->_size = sizea + sizeb;
		a->ptr[a->_size] = '\0';
	} else {
		memcpy(a->_data + sizea, b, sizeb);
		a->space_left = 15 - (sizea + sizeb);
	}
}

static void string_cat(string* a, string* b) {
	string_catn(a, string_data(b), string_len(b));
}

static void string_catc(string* a, const char* b) {
	string_catn(a, b, strlen(b));
}

static int string_cmpc(const string* a, const char* b) {
	size_t asize = string_len(a);
	size_t bsize = strlen(b);
	if (asize == bsize)
		return memcmp(string_data(a), b, asize);

	return asize - bsize;
}

static int string_cmp(const string* a, const string* b) {
	size_t asize = string_len(a);
	size_t bsize = string_len(b);
	if (asize == bsize)
		return memcmp(string_data(a), string_data(b), asize);

	return asize - bsize;
}

static bool string_equalsc(const string* s1, const char* s2) {
	if (string_data(s1) == NULL && s2 != NULL ||
		string_data(s1) != NULL && s2 == NULL)
		return false;
	return string_cmpc(s1, s2) == 0;
}

static bool string_equals(const string* s1, const string* s2) {
	if (string_data(s1) == NULL && string_data(s2) != NULL ||
		string_data(s1) != NULL && string_data(s2) == NULL)
		return false;
	return string_cmp(s1, s2) == 0;
}

static bool string_startswithc(const string* s1, const char* s2) {
	if (string_data(s1) == NULL && s2 != NULL ||
		string_data(s1) != NULL && s2 == NULL)
		return false;
	size_t s2len = strlen(s2);
	if (s2len > string_len(s1))
		return false;

	return memcmp(string_data(s1), s2, s2len) == 0;
}

static bool string_startswith(const string* s1, const string* s2) {
	if (string_data(s1) == NULL && string_data(s2) != NULL ||
		string_data(s1) != NULL && string_data(s2) == NULL ||
		string_len(s2) > string_len(s1))
		return false;

	return memcmp(string_data(s1), string_data(s2), string_len(s2)) == 0;
}

// %p = *string
__attribute__((format(printf, 2, 3))) static void
string_printf(string* dest, const char* format, ...) {
	va_list argp;
	va_start(argp, format);
	while (*format) {
		if (*format == '%') {
			format++;
			switch (*format) {
			case '%':
				string_catn(dest, "%", 1);
				break;
			case 's': {
				const char* s = va_arg(argp, char*);
				string_catc(dest, s);
				break;
			}
			case 'p': {
				string* s = va_arg(argp, string*);
				string_cat(dest, s);
				break;
			}
			}
		} else {
			string_catn(dest, format, 1);
		}
		format++;
	}
	va_end(argp);
}

static string string_readline_til(FILE* f, char delim) {
	string res = string_empty;

	char c;
	while (fread(&c, 1, 1, f) == 1) {
		if (c == delim || c == '\n')
			break;
		string_catn(&res, &c, 1);
	}

	return res;
}

static void string_trim(string* x, const char* trimset) {
	if (!trimset[0])
		return;
	char* dataptr = string_data(x);
	char* orig = dataptr;

	// this is similar to strspn/strpbrk but it works on binary data
	unsigned char mask[32] = {0};

#define checkbit(byte)                                                         \
	(mask[(unsigned char)byte / 8] & 1 << (unsigned char)byte % 8)
#define setbit(byte)                                                           \
	(mask[(unsigned char)byte / 8] |= 1 << (unsigned char)byte % 8)
	size_t i;
	size_t slen = string_len(x);
	size_t trimlen = strlen(trimset);

	for (i = 0; i < trimlen; i++)
		setbit(trimset[i]);
	for (i = 0; i < slen; i++)
		if (!checkbit(dataptr[i]))
			break;
	for (; slen > 0; slen--)
		if (!checkbit(dataptr[slen - 1]))
			break;
	dataptr += i;
	slen -= i;

	// people reserved space to have a buffer on the heap
	// *don't* free it!  just reuse it, don't shrink to in place if < 16 bytes

	memmove(orig, dataptr, slen);
	// don't dirty memory unless it's needed
	if (orig[slen])
		orig[slen] = 0;

	if (x->is_pointer)
		x->_size = slen;
	else
		x->space_left = 15 - slen;
}

#ifdef TEST_STRING
#include <unistd.h>
int main(void) {
	// char buffer[10];
	// read(STDIN_FILENO, buffer, 10);
	// string a = string_init(buffer);
	// read(STDIN_FILENO, buffer, 10);
	// string b = string_init(buffer);
	// printf("%d\n", string_cmp(&a, &b));

	string a = string_empty;
	string_catn(&a, "asdf", 4);
	const char* b = "ts_participant";
	string_catc(&a, b);

	string c = string_init("hsad j sldfk jjk j jdj asdfs ");
	string_cat(&a, &c);
	string d = string_init("ff");
	string_cat(&a, &d);

	printf("%s\n", sdata(a));
}
#endif
