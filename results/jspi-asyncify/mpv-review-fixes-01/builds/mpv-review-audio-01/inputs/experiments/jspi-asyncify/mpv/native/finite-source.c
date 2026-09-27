// SPDX-License-Identifier: MIT
// The first service admits one finite source, never nested network resources.
#include <errno.h>
#include <libavformat/avformat.h>
const char *web_resource_url(void) { return NULL; }
int web_resource_avio_open(AVFormatContext *s, AVIOContext **pb,
                          const char *url, int flags, AVDictionary **options) {
    (void)s;(void)pb;(void)url;(void)flags;(void)options;
    return AVERROR(EACCES);
}
int web_resource_avio_close(AVFormatContext *s, AVIOContext *pb) {
    (void)s;(void)pb;return AVERROR(EACCES);
}
