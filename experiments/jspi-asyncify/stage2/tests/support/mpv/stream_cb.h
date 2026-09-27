// SPDX-License-Identifier: MIT
// TEST ONLY: callback declarations extracted from pinned include/mpv/stream_cb.h.
// This is NOT a replacement libmpv header or a claim of a full SDK build.
#pragma once
#include <stdint.h>
typedef struct mpv_handle mpv_handle;
#define MPV_ERROR_GENERIC (-20)
#define MPV_ERROR_LOADING_FAILED (-13)
typedef int64_t (*mpv_stream_cb_read_fn)(void *,char *,uint64_t);
typedef int64_t (*mpv_stream_cb_seek_fn)(void *,int64_t);
typedef int64_t (*mpv_stream_cb_size_fn)(void *);
typedef void (*mpv_stream_cb_close_fn)(void *);
typedef void (*mpv_stream_cb_cancel_fn)(void *);
typedef struct mpv_stream_cb_info {
 void *cookie;mpv_stream_cb_read_fn read_fn;mpv_stream_cb_seek_fn seek_fn;
 mpv_stream_cb_size_fn size_fn;mpv_stream_cb_close_fn close_fn;mpv_stream_cb_cancel_fn cancel_fn;
} mpv_stream_cb_info;
typedef int (*mpv_stream_cb_open_ro_fn)(void *,char *,mpv_stream_cb_info *);
int mpv_stream_cb_add_ro(mpv_handle *,const char *,void *,mpv_stream_cb_open_ro_fn);
