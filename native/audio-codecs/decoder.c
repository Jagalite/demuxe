// SPDX-License-Identifier: Apache-2.0
// Packet ABI: one owner, complete packets, time base 1/sample_rate.
#include <libavcodec/avcodec.h>
#include <libavutil/mem.h>
#include <libavutil/log.h>
#include <libavutil/opt.h>
#include <stdint.h>
typedef struct { AVCodecContext *c; AVFrame *f; AVPacket *p; int id; int core_only; int rate, channels, bits, extra_size; uint8_t *extra; } Decoder;
void mc_destroy(Decoder *d) { if(!d)return; avcodec_free_context(&d->c); av_frame_free(&d->f); av_packet_free(&d->p); av_free(d->extra); av_free(d); }
static int open_decoder(Decoder *d) {
 const AVCodec *c=avcodec_find_decoder(d->id); if(!c)return AVERROR_DECODER_NOT_FOUND;
 d->c=avcodec_alloc_context3(c); if(!d->c)return AVERROR(ENOMEM);
 d->c->thread_count=1; d->c->pkt_timebase=(AVRational){1,d->rate};
 d->c->sample_rate=d->rate; d->c->bits_per_coded_sample=d->bits;
 if(d->channels)av_channel_layout_default(&d->c->ch_layout,d->channels);
 if(d->extra_size){d->c->extradata=av_mallocz(d->extra_size+AV_INPUT_BUFFER_PADDING_SIZE);if(!d->c->extradata)return AVERROR(ENOMEM);memcpy(d->c->extradata,d->extra,d->extra_size);d->c->extradata_size=d->extra_size;}
 if(d->id==AV_CODEC_ID_DTS){int r=av_opt_set_int(d->c->priv_data,"core_only",d->core_only,0);if(r<0)return r;}
 return avcodec_open2(d->c,c,0);
}
Decoder *mc_create_config(int kind,int rate,int channels,int bits,const uint8_t *extra,int size) {
 static const enum AVCodecID ids[]={AV_CODEC_ID_AC3,AV_CODEC_ID_EAC3,AV_CODEC_ID_DTS,AV_CODEC_ID_TRUEHD,AV_CODEC_ID_MLP,AV_CODEC_ID_DTS,AV_CODEC_ID_AAC,AV_CODEC_ID_OPUS,AV_CODEC_ID_VORBIS,AV_CODEC_ID_FLAC,AV_CODEC_ID_ALAC,AV_CODEC_ID_MP3,AV_CODEC_ID_PCM_S16LE,AV_CODEC_ID_PCM_S24LE,AV_CODEC_ID_PCM_S32LE,AV_CODEC_ID_PCM_F32LE,AV_CODEC_ID_PCM_F64LE};
 if(kind<0||kind>=sizeof(ids)/sizeof(ids[0])||rate<8000||rate>192000||channels<0||channels>8||bits<0||bits>64||size<0||size>65536||(size&&!extra))return 0;
#ifdef DEMUXE_DTS_FULL
 if(kind==2)return 0;
#else
 if(kind==5)return 0;
#endif
 Decoder *d=av_mallocz(sizeof(*d)); if(!d)return 0;
 d->id=ids[kind];d->rate=rate;d->channels=channels;d->bits=bits;
 if(size){d->extra=av_memdup(extra,size);if(!d->extra){mc_destroy(d);return 0;}d->extra_size=size;}
 d->core_only=kind==2;
 av_log_set_level(AV_LOG_QUIET);d->f=av_frame_alloc();d->p=av_packet_alloc();
 if(!d->f||!d->p||open_decoder(d)<0){mc_destroy(d);return 0;}return d;
}
Decoder *mc_create(int kind){return mc_create_config(kind,48000,0,0,0,0);}
int mc_configure(Decoder *d,int rate){if(!d||rate<=0)return AVERROR(EINVAL);d->c->pkt_timebase=(AVRational){1,rate};return 0;}
int mc_decode(Decoder *d,const uint8_t *data,int n,double pts){
 if(!d||n<=0||n>1048576)return AVERROR(EINVAL);
 av_packet_unref(d->p);int r=av_new_packet(d->p,n);if(r<0)return r;
 memcpy(d->p->data,data,n);d->p->pts=d->p->dts=(int64_t)pts;
 r=avcodec_send_packet(d->c,d->p);av_packet_unref(d->p);return r;
}
int mc_frame(Decoder *d){av_frame_unref(d->f);return avcodec_receive_frame(d->c,d->f);}
int mc_flush(Decoder *d){return avcodec_send_packet(d->c,0);}
int mc_reset(Decoder *d,int recreate){
 av_frame_unref(d->f);av_packet_unref(d->p);
 if(!recreate){avcodec_flush_buffers(d->c);return 0;}
 AVRational tb=d->c->pkt_timebase;avcodec_free_context(&d->c);int r=open_decoder(d);if(r>=0)d->c->pkt_timebase=tb;return r;
}
// Frame pointers expire at next mc_frame/reset/destroy. Copy before those calls.
double mc_info(Decoder *d,int field){AVFrame *f=d->f;switch(field){
 case 0:return f->nb_samples;case 1:return f->sample_rate;case 2:return f->ch_layout.nb_channels;
 case 3:return f->format;case 4:return f->pts;case 5:return f->duration;
 case 6:return f->ch_layout.order==AV_CHANNEL_ORDER_NATIVE?(double)f->ch_layout.u.mask:-1;
 case 10:return d->c->profile;case 7:return d->c->delay;case 8:return d->c->initial_padding;case 9:return d->c->bits_per_raw_sample;default:return -1;}}
uint8_t *mc_plane(Decoder *d,int ch){return ch>=0&&ch<d->f->ch_layout.nb_channels?d->f->extended_data[ch]:0;}
