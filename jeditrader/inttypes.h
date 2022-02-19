#pragma once

#define _POSIX_C_SOURCE 200809L
#include <stdbool.h>
#include <stdint.h>

#if defined(__clang__) || defined(__gcc__)
#define STATIC_ASSERT _Static_assert
#else
#define STATIC_ASSERT static_assert
#endif

STATIC_ASSERT(sizeof(bool) == 1, "Expected bool to be 1 bytes.");

typedef uint8_t u8;
typedef uint16_t u16;
typedef uint32_t u32;
typedef uint64_t u64;

typedef int8_t i8;
typedef int16_t i16;
//typedef signed int i32; use "int" instead
typedef int64_t i64;

// Ensure all types are of the correct size.
STATIC_ASSERT(sizeof(u8) == 1, "Expected u8 to be 1 byte.");
STATIC_ASSERT(sizeof(u16) == 2, "Expected u16 to be 2 bytes.");
STATIC_ASSERT(sizeof(u32) == 4, "Expected u32 to be 4 bytes.");
STATIC_ASSERT(sizeof(u64) == 8, "Expected u64 to be 8 bytes.");

STATIC_ASSERT(sizeof(i8) == 1, "Expected i8 to be 1 byte.");
STATIC_ASSERT(sizeof(i16) == 2, "Expected i16 to be 2 bytes.");
//STATIC_ASSERT(sizeof(i32) == 4, "Expected i32 to be 4 bytes.");
STATIC_ASSERT(sizeof(i64) == 8, "Expected i64 to be 8 bytes.");

#define GIBIBYTES(amount) amount * 1024 * 1024 * 1024
#define MEBIBYTES(amount) amount * 1024 * 1024
#define KIBIBYTES(amount) amount * 1024

#define GIGABYTES(amount) amount * 1000 * 1000 * 1000
#define MEGABYTES(amount) amount * 1000 * 1000
#define KILOBYTES(amount) amount * 1000

