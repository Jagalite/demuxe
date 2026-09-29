// SPDX-License-Identifier: MIT
// Explicit, bounded per-logical-task storage for Binaryen's saved Wasm locals.
// Separate from the existing C data stacks. Only used by the experimental driver.
#include <stdint.h>
#ifndef DEMUXE_COOP_SLOTS
#define DEMUXE_COOP_SLOTS 24
#endif
#ifndef DEMUXE_ASYNCIFY_BYTES
#define DEMUXE_ASYNCIFY_BYTES 65536
#endif
_Static_assert(DEMUXE_COOP_SLOTS >= 1 && DEMUXE_COOP_SLOTS <= 256, "slot budget");
_Static_assert(DEMUXE_ASYNCIFY_BYTES >= 256 && DEMUXE_ASYNCIFY_BYTES % 16 == 0,
               "saved continuation stack must be aligned and nontrivial");
struct saved_stack {
    uint32_t pointer, end;
    unsigned char lower_guard[24];
    unsigned char data[DEMUXE_ASYNCIFY_BYTES];
    unsigned char upper_guard[32];
};
static _Alignas(16) struct saved_stack stacks[DEMUXE_COOP_SLOTS];
int demuxe_asyncify_count(void) {return DEMUXE_COOP_SLOTS;}
uintptr_t demuxe_asyncify_data(int i) {
    if(i<0||i>=DEMUXE_COOP_SLOTS)__builtin_trap();
    return (uintptr_t)&stacks[i];
}
uintptr_t demuxe_asyncify_base(int i) {
    if(i<0||i>=DEMUXE_COOP_SLOTS)__builtin_trap();
    return (uintptr_t)stacks[i].data;
}
uintptr_t demuxe_asyncify_end(int i) {return demuxe_asyncify_base(i)+DEMUXE_ASYNCIFY_BYTES;}
