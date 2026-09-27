# SPDX-License-Identifier: MIT
.text
.globaltype __stack_pointer, i32
.globl demuxe_coop_get_sp
.type demuxe_coop_get_sp,@function
demuxe_coop_get_sp:
.functype demuxe_coop_get_sp () -> (i32)
  global.get __stack_pointer
  end_function
.globl demuxe_coop_set_sp
.type demuxe_coop_set_sp,@function
demuxe_coop_set_sp:
.functype demuxe_coop_set_sp (i32) -> ()
  local.get 0
  global.set __stack_pointer
  end_function
