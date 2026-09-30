#pragma once
#include <stdint.h>
#define MP_TIME_S_TO_NS(x) ((int64_t)((x)*1e9))
int64_t mp_time_ns(void);
int64_t mp_time_ns_add(int64_t now,double seconds);
