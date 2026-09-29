// SPDX-License-Identifier: Apache-2.0
#include <libavcodec/avcodec.h>
#include <libavutil/opt.h>
typedef struct {AVCodecContext*c;AVFrame*f;AVPacket*p;} Encoder;
void enc_destroy(Encoder*e){if(!e)return;avcodec_free_context(&e->c);av_frame_free(&e->f);av_packet_free(&e->p);av_free(e);}
Encoder*enc_create(int channels,int level){Encoder*e=av_mallocz(sizeof(*e));if(!e)return 0;e->c=avcodec_alloc_context3(avcodec_find_encoder(AV_CODEC_ID_FLAC));e->f=av_frame_alloc();e->p=av_packet_alloc();if(!e->c||!e->f||!e->p){enc_destroy(e);return 0;}e->c->sample_rate=48000;e->c->sample_fmt=AV_SAMPLE_FMT_S32;e->c->bits_per_raw_sample=24;e->c->time_base=(AVRational){1,48000};e->c->compression_level=level;av_channel_layout_default(&e->c->ch_layout,channels);if(avcodec_open2(e->c,e->c->codec,0)<0){enc_destroy(e);return 0;}e->f->format=e->c->sample_fmt;e->f->sample_rate=48000;av_channel_layout_copy(&e->f->ch_layout,&e->c->ch_layout);e->f->nb_samples=e->c->frame_size;if(av_frame_get_buffer(e->f,0)<0){enc_destroy(e);return 0;}return e;}
int32_t*enc_input(Encoder*e){return (int32_t*)e->f->data[0];}
int enc_size(Encoder*e){return e->c->frame_size;}
int enc_encode(Encoder*e,int n){av_packet_unref(e->p);e->f->nb_samples=n;int r=avcodec_send_frame(e->c,n?e->f:0);if(r<0)return r;r=avcodec_receive_packet(e->c,e->p);return r<0?r:e->p->size;}
uint8_t*enc_data(Encoder*e){return e->p->data;}

uint8_t*enc_header(Encoder*e){return e->c->extradata;}
int enc_header_size(Encoder*e){return e->c->extradata_size;}
