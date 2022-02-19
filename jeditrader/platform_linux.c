#include "platform.h"

#ifdef __unix__
#include <time.h>
#include <stdio.h>
#endif

#ifdef __unix__
u64 get_nanotime() {
  struct timespec now;
  clock_gettime(CLOCK_MONOTONIC, &now);
  return now.tv_sec * 1000000000 + now.tv_nsec;
}
#endif

