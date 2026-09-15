// SPDX-License-Identifier: GPL-2.0-or-later
#include "demux/session-control.h"
#include <assert.h>
#include <errno.h>
#include <stdio.h>
#include <string.h>
#include <libavutil/error.h>
int main(void){
 web_quality_configure(1,1);
 demuxe_control_fail(2,-EIO);assert(!web_quality_error(1));
 demuxe_control_fail(1,-EIO);assert(web_quality_error(1)==-EIO);
 demuxe_control_fail(1,-ENOMEM);assert(web_quality_error(1)==-EIO);
 struct demuxe_adaptive_stats state={.source=1};demuxe_control_update(&state);
 assert(web_quality_error(1)==-EIO);
 demuxe_control_close(1);assert(web_quality_error(1)==-EIO);
 web_quality_configure(2,1);assert(!web_quality_error(1)&&!web_quality_error(2));
 demuxe_control_fail(1,-EIO);assert(!web_quality_error(2));
 demuxe_control_fail(2,-EINVAL);assert(web_quality_error(2)==-EINVAL);
 web_quality_configure(2,0);demuxe_control_fail(2,-EIO);assert(!web_quality_error(2));
 web_quality_configure(0,0);demuxe_control_fail(0,-EIO);assert(!web_quality_error(0));
 const struct {int error;const char *message;} cases[]={
  {AVERROR(ETIMEDOUT),"Integrated streaming resource read timed out"},
  {AVERROR_EXIT,"Integrated streaming read cancelled"},
  {AVERROR(ECANCELED),"Integrated streaming read cancelled"},
  {AVERROR(EIO),"Integrated streaming resource read failed"},
  {AVERROR(ESPIPE),"Integrated streaming resource read failed"},
  {AVERROR(EACCES),"Integrated streaming resource permission denied"},
  {AVERROR_INVALIDDATA,"Integrated streaming demux failed"},
 };
 for(unsigned i=0;i<sizeof(cases)/sizeof(cases[0]);i++){
  web_quality_configure(3,1);assert(!strcmp(web_quality_error_message(3),""));
  demuxe_control_fail(3,cases[i].error);
  assert(!strcmp(web_quality_error_message(3),cases[i].message));
  assert(!strcmp(web_quality_error_message(2),""));
  demuxe_control_close(3);assert(!strcmp(web_quality_error_message(3),cases[i].message));
 }
 puts("PASS first terminal error, close retention, source replacement and disabled scope");return 0;
}
