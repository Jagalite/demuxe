// SPDX-License-Identifier: MIT
// Non-pthread libc state associated with the active logical mpv task.
#include <errno.h>
#include <stdint.h>
#include <emscripten/stack.h>
int demuxe_context_errno(void) { return errno; }
uintptr_t demuxe_context_stack_base(void) { return emscripten_stack_get_base(); }
uintptr_t demuxe_context_stack_end(void) { return emscripten_stack_get_end(); }
void demuxe_context_enter(uintptr_t lo, uintptr_t hi, int error) {
    emscripten_stack_set_limits((void *)hi, (void *)lo);
    errno = error;
}
