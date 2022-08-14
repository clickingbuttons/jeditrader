// https://github.com/wangyi-fudan/wyhash/blob/master/wyhash.h
#pragma once

#include "inttypes.h"
#include <string.h>

#define _likely_(x) __builtin_expect(x, 1)
#define _unlikely_(x) __builtin_expect(x, 0)

// 128bit multiply function
static inline void _wymum(uint64_t* A, uint64_t* B) {
	__uint128_t r = *A;
	r *= *B;
	*A = (uint64_t)r;
	*B = (uint64_t)(r >> 64);
}

// multiply and xor mix function, aka MUM
static inline uint64_t _wymix(uint64_t A, uint64_t B) {
	_wymum(&A, &B);
	return A ^ B;
}

static inline uint64_t _wyr8(const uint8_t* p) {
	uint64_t v;
	memcpy(&v, p, 8);
	return v;
}
static inline uint64_t _wyr4(const uint8_t* p) {
	uint32_t v;
	memcpy(&v, p, 4);
	return v;
}

static inline uint64_t _wyr3(const uint8_t* p, size_t k) {
	return (((uint64_t)p[0]) << 16) | (((uint64_t)p[k >> 1]) << 8) | p[k - 1];
}

static const uint64_t secret[4] = {0xa0761d6478bd642full, 0xe7037ed1a0b428dbull,
								   0x8ebc6af09c88c6e3ull,
								   0x589965cc75374cc3ull};
static const uint64_t seed = 0x9c4f07a9ed627453ull;

static inline uint64_t wyhash(const void* key, size_t len) {
	const uint8_t* p = (const uint8_t*)key;
	uint64_t see0 = seed ^ secret[0];
	uint64_t a, b;
	if (_likely_(len <= 16)) {
		if (_likely_(len >= 4)) {
			a = (_wyr4(p) << 32) | _wyr4(p + ((len >> 3) << 2));
			b = (_wyr4(p + len - 4) << 32) |
				_wyr4(p + len - 4 - ((len >> 3) << 2));
		} else if (_likely_(len > 0)) {
			a = _wyr3(p, len);
			b = 0;
		} else
			a = b = 0;
	} else {
		size_t i = len;
		if (_unlikely_(i > 48)) {
			uint64_t see1 = see0, see2 = see0;
			do {
				see0 = _wymix(_wyr8(p) ^ secret[1], _wyr8(p + 8) ^ see0);
				see1 = _wymix(_wyr8(p + 16) ^ secret[2], _wyr8(p + 24) ^ see1);
				see2 = _wymix(_wyr8(p + 32) ^ secret[3], _wyr8(p + 40) ^ see2);
				p += 48;
				i -= 48;
			} while (_likely_(i > 48));
			see0 ^= see1 ^ see2;
		}
		while (_unlikely_(i > 16)) {
			see0 = _wymix(_wyr8(p) ^ secret[1], _wyr8(p + 8) ^ see0);
			i -= 16;
			p += 16;
		}
		a = _wyr8(p + i - 16);
		b = _wyr8(p + i - 8);
	}
	return _wymix(secret[1] ^ len, _wymix(a ^ secret[1], b ^ see0));
}
