// SPDX-License-Identifier: LGPL-2.1-or-later
#ifndef DEMUXE_EXTERNAL_DECODER_BRIDGE_H
#define DEMUXE_EXTERNAL_DECODER_BRIDGE_H
#include <stdint.h>
#include <stdatomic.h>
#define WEB_DEC_PACKET_MAX (8 * 1024 * 1024)
#define WEB_DEC_FRAME_MAX (1920 * 1080 * 3 / 2)
// Generic external decoder mailbox. One native decoder thread owns requests;
// the service acknowledges a ticket before native may reuse packet bytes.
// The initial fields and exported web_decoder_* names preserve the engine ABI.
// A retained surface lives outside Wasm; the 2x2 AVFrame is timing metadata only.
struct browser_decoder_mailbox {
    _Atomic int state;
    int serial, operation, result;
    int size, width, height, key;
    int format, primaries, transfer, matrix;
    int full_range, reserved[3];
    double timestamp, duration;
    unsigned char packet[WEB_DEC_PACKET_MAX];
    unsigned char frame[WEB_DEC_FRAME_MAX];
    // Extension for non-WebCodecs adapters. Never move the legacy fields.
    char codec_name[64];
};
extern struct browser_decoder_mailbox web_decoder;
int web_decoder_enabled(void);
#endif
