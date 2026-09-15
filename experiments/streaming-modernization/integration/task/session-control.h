// SPDX-License-Identifier: GPL-2.0-or-later
#pragma once
#include "adaptive-session.h"
#include "common/demuxe-quality.h"
// One engine instance, one source-bound mailbox. Calls never enter libmpv.
void web_quality_configure(int source,int enabled);
int web_quality_request(int source,int request,int representation);
const char *web_quality_status(void);
int demuxe_control_enabled(uint64_t source);
int demuxe_control_bind(uint64_t source,const int *streams,const int *widths,const int *heights,const int *bitrates,int count);
int demuxe_control_poll(uint64_t source,uint64_t after,uint64_t *request,int *stream);
void demuxe_control_update(const struct demuxe_adaptive_stats *);
void demuxe_control_close(uint64_t source);

void demuxe_control_selected(struct demuxe_quality_tag);
const char *web_quality_selected(void);
void web_quality_presented(int source,int request,int representation);
