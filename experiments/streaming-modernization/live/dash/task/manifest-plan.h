// SPDX-License-Identifier: GPL-3.0-or-later
#pragma once
#include <string.h>
#include <libavformat/avformat.h>
#include <libavformat/demuxe.h>
static inline int demuxe_manifest_supported(AVFormatContext *f){return f&&f->iformat&&(!strcmp(f->iformat->name,"hls")||!strcmp(f->iformat->name,"dash"));}
static inline int demuxe_manifest_refresh(AVFormatContext *f,int stream){return !strcmp(f->iformat->name,"hls")?av_demuxe_hls_refresh(f,stream):av_demuxe_dash_refresh(f);}
static inline int demuxe_manifest_handoff(AVFormatContext *f){return !strcmp(f->iformat->name,"hls")?av_demuxe_hls_handoff(f):av_demuxe_dash_handoff(f);}
static inline int demuxe_manifest_window(AVFormatContext *f,int stream,struct AVDemuxeWindow *out){return !strcmp(f->iformat->name,"hls")?av_demuxe_hls_window(f,stream,out):av_demuxe_dash_window(f,stream,out);}
static inline int demuxe_manifest_segment(AVFormatContext *f,int stream,int64_t sequence,int64_t target,struct AVDemuxeSegment *out){return !strcmp(f->iformat->name,"hls")?av_demuxe_hls_segment(f,stream,sequence,target,out):av_demuxe_dash_segment(f,stream,sequence,target,out);}
static inline int demuxe_manifest_retirement(AVFormatContext *f,void (*callback)(void*,const char*),void *opaque){return !strcmp(f->iformat->name,"hls")?av_demuxe_hls_retirement(f,callback,opaque):0;}
