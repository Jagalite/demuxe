// SPDX-License-Identifier: GPL-3.0-or-later
#pragma once
#include <libavcodec/packet.h>
#include <libavcodec/codec_par.h>
// Initial qualification is AVC in fMP4. A container key flag alone does not
// establish a closed switching point (for example, an open-GOP recovery frame).
int demuxe_h264_random_access(const AVPacket *,const AVCodecParameters *);
