/* Optional preparation profile. Included by the maintained packet bridge.
 * The decoder is selected only for the selected audio stream. No video decoder
 * is enabled in the build. Integer samples are copied without swresample. */
#ifndef DEMUXE_FLAC_LEVEL
#define DEMUXE_FLAC_LEVEL 5
#endif
#include <libavcodec/avcodec.h>
#include <libavutil/audio_fifo.h>
#include <libavutil/samplefmt.h>
#include <libavutil/opt.h>
#include <libavutil/intreadwrite.h>
static AVCodecContext *adapt_decoder,*adapt_encoder;
static AVFrame *adapt_decoded;
static AVPacket *adapt_encoded;
static AVAudioFifo *adapt_fifo;
static int64_t adapt_first_pts,adapt_decoded_samples,adapt_encoded_samples;
static int64_t adapt_video_packets,adapt_audio_frames,adapt_audio_packets;
static double adapt_last_end;
static int64_t adapt_discard_samples;
static void adaptation_stats(void){
 EM_ASM({Module.adaptation=({codec:$9?'opus':'flac',videoPacketsCopied:$0,audioFramesDecoded:$1,audioSamplesDecoded:$2,audioSamplesEncoded:$3,audioPacketsEncoded:$4,sourceEnd:$5,videoFramesDecoded:0,videoFramesEncoded:0,sampleRate:$6,channels:$7,bits:$8,discardPaddingSamples:$10,encoderDelaySamples:$11});},(double)adapt_video_packets,(double)adapt_audio_frames,(double)adapt_decoded_samples,(double)adapt_encoded_samples,(double)adapt_audio_packets,adapt_last_end,adapt_encoder?adapt_encoder->sample_rate:0,adapt_encoder?adapt_encoder->ch_layout.nb_channels:0,adapt_encoder?adapt_encoder->bits_per_raw_sample:0,adapt_enabled==2,(double)adapt_discard_samples,adapt_encoder?adapt_encoder->initial_padding:0);
}
static void adaptation_close(void){
 avcodec_free_context(&adapt_decoder);avcodec_free_context(&adapt_encoder);
 av_frame_free(&adapt_decoded);av_packet_free(&adapt_encoded);
 av_audio_fifo_free(adapt_fifo);adapt_fifo=NULL;
}
static int adaptation_describe(AVCodecParameters *p){
 if(adapt_enabled==2&&(video<0||in->streams[video]->codecpar->codec_id!=AV_CODEC_ID_H264||(p->codec_id!=AV_CODEC_ID_PCM_S16LE&&p->codec_id!=AV_CODEC_ID_PCM_S24LE)))return reject("Opus profile is qualified only for copied H264 with selected PCM S16/S24 audio");
 if(p->codec_id!=AV_CODEC_ID_PCM_S16LE&&p->codec_id!=AV_CODEC_ID_PCM_S24LE&&p->codec_id!=AV_CODEC_ID_PCM_S32LE&&p->codec_id!=AV_CODEC_ID_FLAC&&p->codec_id!=AV_CODEC_ID_DTS)return reject("Audio codec is not qualified for lossless adaptation");
 if(p->sample_rate<=0||p->sample_rate>192000||(p->ch_layout.order!=AV_CHANNEL_ORDER_NATIVE&&p->ch_layout.order!=AV_CHANNEL_ORDER_UNSPEC)||p->ch_layout.nb_channels<1||p->ch_layout.nb_channels>2)return reject("FLAC adaptation requires an established mono/stereo layout and sample rate");
 int bits=p->bits_per_raw_sample;
 if(p->codec_id==AV_CODEC_ID_PCM_S16LE)bits=16;
 if(p->codec_id==AV_CODEC_ID_PCM_S24LE)bits=24;
 if(p->codec_id==AV_CODEC_ID_PCM_S32LE)bits=32;
 if(bits!=16&&bits!=24)return reject("Lossless FLAC requires established 16/24-bit integer precision; no quantization permitted");
 if(adapt_enabled==2&&p->sample_rate!=48000)return reject("Opus adaptation requires 48 kHz input; resampling is not permitted");
 snprintf(audio_codec,sizeof(audio_codec),"%s",adapt_enabled==2?"opus":"flac");return 0;
}
static int adaptation_open(void){
 if(audio<0)return reject("Audio adaptation requires a selected audio track");
 AVCodecParameters *p=in->streams[audio]->codecpar;
 int r=adaptation_describe(p);if(r<0)return r;
 const AVCodec *dec=avcodec_find_decoder(p->codec_id),*enc=avcodec_find_encoder(adapt_enabled==2?AV_CODEC_ID_OPUS:AV_CODEC_ID_FLAC);
 if(!dec||!enc)return reject("Required audio decoder/adaptation encoder unavailable");
 adapt_decoder=avcodec_alloc_context3(dec);adapt_encoder=avcodec_alloc_context3(enc);
 if(!adapt_decoder||!adapt_encoder)return AVERROR(ENOMEM);
 r=avcodec_parameters_to_context(adapt_decoder,p);if(r<0)return r;
 if(adapt_decoder->ch_layout.order==AV_CHANNEL_ORDER_UNSPEC){int n=adapt_decoder->ch_layout.nb_channels;av_channel_layout_uninit(&adapt_decoder->ch_layout);av_channel_layout_default(&adapt_decoder->ch_layout,n);}
 adapt_decoder->pkt_timebase=in->streams[audio]->time_base;adapt_decoder->thread_count=1;
 int bits=p->codec_id==AV_CODEC_ID_PCM_S16LE?16:p->codec_id==AV_CODEC_ID_PCM_S24LE?24:p->bits_per_raw_sample;
 adapt_decoder->request_sample_fmt=bits==16?AV_SAMPLE_FMT_S16:AV_SAMPLE_FMT_S32;
 r=avcodec_open2(adapt_decoder,dec,NULL);if(r<0)return r;
 adapt_encoder->sample_fmt=adapt_enabled==2?AV_SAMPLE_FMT_FLTP:bits==16?AV_SAMPLE_FMT_S16:AV_SAMPLE_FMT_S32;
 adapt_encoder->bits_per_raw_sample=adapt_enabled==2?0:bits;adapt_encoder->sample_rate=p->sample_rate;
 av_channel_layout_copy(&adapt_encoder->ch_layout,&adapt_decoder->ch_layout);
 adapt_encoder->time_base=(AVRational){1,p->sample_rate};adapt_encoder->thread_count=1;
 adapt_encoder->flags|=AV_CODEC_FLAG_GLOBAL_HEADER;adapt_encoder->compression_level=DEMUXE_FLAC_LEVEL;
 if(adapt_enabled==2){adapt_encoder->strict_std_compliance=FF_COMPLIANCE_EXPERIMENTAL;adapt_encoder->bit_rate=96000*p->ch_layout.nb_channels;}
 r=avcodec_open2(adapt_encoder,enc,NULL);if(r<0)return r;
 adapt_decoded=av_frame_alloc();adapt_encoded=av_packet_alloc();
 adapt_fifo=av_audio_fifo_alloc(adapt_encoder->sample_fmt,p->ch_layout.nb_channels,adapt_encoder->frame_size*2);
 if(!adapt_decoded||!adapt_encoded||!adapt_fifo)return AVERROR(ENOMEM);
 adapt_first_pts=AV_NOPTS_VALUE;adapt_decoded_samples=adapt_encoded_samples=adapt_video_packets=adapt_audio_frames=adapt_audio_packets=0;adapt_last_end=0;adapt_discard_samples=0;
 return 0;
}
static int adaptation_packets(void){
 int r;
 while((r=avcodec_receive_packet(adapt_encoder,adapt_encoded))>=0){
  const AVPacketSideData *skip=av_packet_side_data_get(adapt_encoded->side_data,adapt_encoded->side_data_elems,AV_PKT_DATA_SKIP_SAMPLES);
  if(skip&&skip->size>=10)adapt_discard_samples+=AV_RL32(skip->data+4);
  adapt_encoded->stream_index=map[audio];adapt_encoded->pos=-1;
  av_packet_rescale_ts(adapt_encoded,adapt_encoder->time_base,out->streams[map[audio]]->time_base);
  r=av_interleaved_write_frame(out,adapt_encoded);av_packet_unref(adapt_encoded);if(r<0)return r;
  adapt_audio_packets++;
 }
 return r==AVERROR(EAGAIN)||r==AVERROR_EOF?0:r;
}
static int adaptation_encode(int final){
 int size=adapt_encoder->frame_size;
 while(av_audio_fifo_size(adapt_fifo)>=size||(final&&av_audio_fifo_size(adapt_fifo)>0)){
  AVFrame *f=av_frame_alloc();if(!f)return AVERROR(ENOMEM);
  f->nb_samples=FFMIN(size,av_audio_fifo_size(adapt_fifo));f->format=adapt_encoder->sample_fmt;f->sample_rate=adapt_encoder->sample_rate;
  av_channel_layout_copy(&f->ch_layout,&adapt_encoder->ch_layout);f->pts=adapt_first_pts+adapt_encoded_samples;
  int r=av_frame_get_buffer(f,0);
  if(r>=0&&av_audio_fifo_read(adapt_fifo,(void**)f->extended_data,f->nb_samples)!=f->nb_samples)r=AVERROR_BUG;
  if(r>=0){r=avcodec_send_frame(adapt_encoder,f);if(r>=0)adapt_encoded_samples+=f->nb_samples;}
  av_frame_free(&f);if(r<0)return r;
  r=adaptation_packets();if(r<0)return r;
 }
 return 0;
}
static int adaptation_frames(void){
 int r;
 while((r=avcodec_receive_frame(adapt_decoder,adapt_decoded))>=0){
  AVFrame *f=adapt_decoded;int channels=adapt_encoder->ch_layout.nb_channels;
  if(f->sample_rate!=adapt_encoder->sample_rate||av_channel_layout_compare(&f->ch_layout,&adapt_encoder->ch_layout)||av_get_packed_sample_fmt(f->format)!=(adapt_enabled==2?adapt_decoder->request_sample_fmt:adapt_encoder->sample_fmt))return reject("Decoded audio configuration/precision changed; lossless adaptation rejected");
  if(f->pts==AV_NOPTS_VALUE)return reject("Missing decoded audio timestamp");
  int64_t pts=av_rescale_q(f->pts,adapt_decoder->pkt_timebase,adapt_encoder->time_base);
  if(adapt_first_pts==AV_NOPTS_VALUE)adapt_first_pts=pts;
  int64_t tolerance=FFMAX(1,av_rescale_q(1,adapt_decoder->pkt_timebase,adapt_encoder->time_base));
  if(llabs(pts-adapt_first_pts-adapt_decoded_samples)>tolerance)return reject("Decoded audio timeline discontinuity");
  if(f->nb_samples<=0||f->nb_samples>65536)return reject("Decoded audio frame budget exceeded");
  int bytes=av_get_bytes_per_sample(f->format),planar=av_sample_fmt_is_planar(f->format);
  AVFrame *converted=av_frame_alloc();if(!converted)return AVERROR(ENOMEM);
  converted->nb_samples=f->nb_samples;converted->format=adapt_encoder->sample_fmt;
  av_channel_layout_copy(&converted->ch_layout,&adapt_encoder->ch_layout);
  r=av_frame_get_buffer(converted,0);if(r<0){av_frame_free(&converted);return r;}
  for(int i=0;i<f->nb_samples;i++)for(int c=0;c<channels;c++){
   const uint8_t *sample=planar?f->extended_data[c]+i*bytes:f->extended_data[0]+(i*channels+c)*bytes;
   int32_t value=0;if(bytes==4){memcpy(&value,sample,4);if(value&255){av_frame_free(&converted);return reject("Decoded samples exceed established 24-bit precision");}}
   if(adapt_enabled==2){
    // Every admitted S16/S24 value has an exact binary32 representation. This
    // is format conversion only: no sample insertion, resampling or downmix.
    float v;if(bytes==2){int16_t n;memcpy(&n,sample,2);v=n/32768.0f;}else v=value/2147483648.0f;
    memcpy(converted->extended_data[c]+i*4,&v,4);
   }else memcpy(converted->data[0]+(i*channels+c)*bytes,sample,bytes);
  }
  if(av_audio_fifo_size(adapt_fifo)+f->nb_samples>131072){av_frame_free(&converted);return reject("Audio FIFO budget exceeded");}
  r=av_audio_fifo_write(adapt_fifo,(void**)converted->extended_data,f->nb_samples);av_frame_free(&converted);if(r!=f->nb_samples)return r<0?r:AVERROR_BUG;
  adapt_decoded_samples+=f->nb_samples;adapt_audio_frames++;av_frame_unref(f);
  r=adaptation_encode(0);if(r<0)return r;
 }
 return r==AVERROR(EAGAIN)||r==AVERROR_EOF?0:r;
}
static int adaptation_packet(AVPacket *p){
 int r=avcodec_send_packet(adapt_decoder,p);if(r<0)return r;
 return adaptation_frames();
}
static int adaptation_finish(void){
 int r=avcodec_send_packet(adapt_decoder,NULL);if(r<0&&r!=AVERROR_EOF)return r;
 r=adaptation_frames();if(r<0)return r;r=adaptation_encode(1);if(r<0)return r;
 r=avcodec_send_frame(adapt_encoder,NULL);if(r<0)return r;
 r=adaptation_packets();if(r<0)return r;
 if(adapt_decoded_samples!=adapt_encoded_samples)return reject("Audio encoder drain lost samples");
 adaptation_stats();return 0;
}
