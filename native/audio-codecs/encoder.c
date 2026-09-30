// SPDX-License-Identifier: Apache-2.0
#include <libavcodec/avcodec.h>
#include <libavutil/mem.h>
#include <stdint.h>
typedef struct { AVCodecContext *c; AVFrame *f; AVPacket *p; int64_t pts; int prepared; int32_t *input; } Encoder;
void ae_destroy(Encoder *e) {
 if (!e) return;
 avcodec_free_context(&e->c); av_frame_free(&e->f); av_packet_free(&e->p); av_free(e->input); av_free(e);
}
Encoder *ae_create(int channels, int level) {
 if ((channels != 1 && channels != 2 && channels != 6 && channels != 8) || level < 0 || level > 12) return 0;
#ifdef DEMUXE_OPUS_ENCODER
 if (channels > 2) return 0;
 const AVCodec *codec = avcodec_find_encoder(AV_CODEC_ID_OPUS);
#else
 const AVCodec *codec = avcodec_find_encoder(AV_CODEC_ID_FLAC);
#endif
 if (!codec) return 0;
 Encoder *e = av_mallocz(sizeof(*e)); if (!e) return 0;
 e->c = avcodec_alloc_context3(codec); e->f = av_frame_alloc(); e->p = av_packet_alloc();
 if (!e->c || !e->f || !e->p) { ae_destroy(e); return 0; }
 e->c->sample_rate = 48000; e->c->sample_fmt = AV_SAMPLE_FMT_S32;
 e->c->bits_per_raw_sample = 24; e->c->time_base = (AVRational){1,48000};
#ifdef DEMUXE_OPUS_ENCODER
 e->c->sample_fmt = AV_SAMPLE_FMT_FLTP;
 e->c->bits_per_raw_sample = 0;
 e->c->strict_std_compliance = FF_COMPLIANCE_EXPERIMENTAL;
#endif
 e->c->compression_level = level; av_channel_layout_default(&e->c->ch_layout, channels);
 if (avcodec_open2(e->c, codec, 0) < 0) { ae_destroy(e); return 0; }
 e->f->format = e->c->sample_fmt; e->f->sample_rate = 48000;
 av_channel_layout_copy(&e->f->ch_layout, &e->c->ch_layout); e->f->nb_samples = e->c->frame_size;
 if (av_frame_get_buffer(e->f, 0) < 0) { ae_destroy(e); return 0; }
#ifdef DEMUXE_OPUS_ENCODER
 e->input = av_malloc_array(e->c->frame_size * channels, sizeof(int32_t));
 if (!e->input) { ae_destroy(e); return 0; }
#endif
 return e;
}
int ae_size(Encoder *e) { return e->c->frame_size; }
int32_t *ae_input(Encoder *e) {
 e->f->nb_samples = e->c->frame_size;
 if (av_frame_make_writable(e->f) < 0) return 0;
 e->prepared = 1;
#ifdef DEMUXE_OPUS_ENCODER
 return e->input;
#else
 return (int32_t *)e->f->data[0];
#endif
}
int ae_send(Encoder *e, int n) {
 if (n < 0 || n > e->c->frame_size || (n && !e->prepared)) return AVERROR(EINVAL);
#ifdef DEMUXE_OPUS_ENCODER
 for (int ch = 0; ch < e->c->ch_layout.nb_channels; ch++)
  for (int i = 0; i < n; i++)
   ((float *)e->f->data[ch])[i] = e->input[i * e->c->ch_layout.nb_channels + ch] / 2147483648.0f;
#endif
 e->f->nb_samples = n; e->f->pts = e->pts;
 int result = avcodec_send_frame(e->c, n ? e->f : 0);
 if (result >= 0) { e->pts += n; e->prepared = 0; }
 return result;
}
int ae_receive(Encoder *e) { av_packet_unref(e->p); return avcodec_receive_packet(e->c, e->p); }
uint8_t *ae_data(Encoder *e) { return e->p->data; }
int ae_bytes(Encoder *e) { return e->p->size; }
double ae_pts(Encoder *e) { return e->p->pts; }
int ae_duration(Encoder *e) { return e->p->duration; }
uint8_t *ae_header(Encoder *e) { return e->c->extradata; }
int ae_header_size(Encoder *e) { return e->c->extradata_size; }

int ae_preskip(Encoder *e) { return e->c->initial_padding; }
