// SPDX-License-Identifier: GPL-3.0-or-later
#pragma once
#include <stdint.h>
int emscripten_futex_wake(void *, int);
int emscripten_futex_wait(void *, uint32_t, double);
