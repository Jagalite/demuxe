// SPDX-License-Identifier: Apache-2.0
// Packet ABI: one owner, complete packets, time base 1/sample_rate.
#include <libavcodec/avcodec.h>
#include <libavutil/mem.h>
#include <libavutil/log.h>
#include <libavutil/opt.h>
#include <libavutil/crc.h>
#include <libavutil/intreadwrite.h>
#include <stdint.h>
typedef struct { AVCodecContext *c; AVFrame *f; AVPacket *p; int id; int core_only; int rate, channels, bits, extra_size, block_align, bit_rate; uint8_t *extra; int64_t next_pts, anchor_pts, expected_samples; int have_pts, have_anchor, timestamp_origin; } Decoder;
void mc_destroy(Decoder *d) { if(!d)return; avcodec_free_context(&d->c); av_frame_free(&d->f); av_packet_free(&d->p); av_free(d->extra); av_free(d); }
static int open_decoder(Decoder *d) {
 const AVCodec *c=avcodec_find_decoder(d->id); if(!c)return AVERROR_DECODER_NOT_FOUND;
 d->c=avcodec_alloc_context3(c); if(!d->c)return AVERROR(ENOMEM);
 d->c->thread_count=1; d->c->pkt_timebase=(AVRational){1,d->rate};
 if(d->id==AV_CODEC_ID_TTA||d->id==AV_CODEC_ID_TAK)d->c->err_recognition=AV_EF_CRCCHECK|AV_EF_EXPLODE;
 d->c->sample_rate=d->rate; d->c->bits_per_coded_sample=d->bits;
 d->c->block_align=d->block_align;d->c->bit_rate=d->bit_rate;
 if(d->channels)av_channel_layout_default(&d->c->ch_layout,d->channels);
 if(d->extra_size){d->c->extradata=av_mallocz(d->extra_size+AV_INPUT_BUFFER_PADDING_SIZE);if(!d->c->extradata)return AVERROR(ENOMEM);memcpy(d->c->extradata,d->extra,d->extra_size);d->c->extradata_size=d->extra_size;}
 if(d->id==AV_CODEC_ID_APE){int r=av_opt_set_int(d->c->priv_data,"max_samples",32768,0);if(r<0)return r;}
 if(d->id==AV_CODEC_ID_DTS){int r=av_opt_set_int(d->c->priv_data,"core_only",d->core_only,0);if(r<0)return r;}
 return avcodec_open2(d->c,c,0);
}
// Bounded first TAK profile: canonical codec2/profile2,125ms44100mono16.
static uint64_t tak_lsb(const uint8_t *data,int *position,int count){uint64_t value=0;for(int bit=0;bit<count;bit++){int offset=(*position)++;value|=(uint64_t)((data[offset/8]>>(offset%8))&1)<<bit;}return value;}
static int tak_profile(int rate,int channels,int bits,const uint8_t *extra,int size){
 if(size!=10||!extra||rate!=44100||channels!=1||bits!=16)return 0;
 int position=0;if(tak_lsb(extra,&position,6)!=2||tak_lsb(extra,&position,4)!=2||tak_lsb(extra,&position,4)!=1||!tak_lsb(extra,&position,35)||tak_lsb(extra,&position,3)!=0)return 0;
 return tak_lsb(extra,&position,18)+6000==rate&&tak_lsb(extra,&position,5)+8==bits&&tak_lsb(extra,&position,4)+1==channels&&tak_lsb(extra,&position,1)==0;
}
// Canonical SHN v2 signed16 little-endian profile. Validate the actual embedded
// RIFF header before anchoring a stream clock; decoder output validates it again.
typedef struct{const uint8_t *data;int size,position,valid;} ShnBits;
static uint64_t shn_bits(ShnBits *b,int count){uint64_t value=0;if(count<0||count>32||b->position+count>b->size*8){b->valid=0;return 0;}for(int i=0;i<count;i++){int p=b->position++;value=(value<<1)|((b->data[p/8]>>(7-p%8))&1);}return value;}
static uint64_t shn_rice(ShnBits *b,int bits){if(bits>31){b->valid=0;return 0;}uint64_t quotient=0;while(b->valid&&!shn_bits(b,1)){if(++quotient>4096){b->valid=0;return 0;}}return(quotient<<bits)|shn_bits(b,bits);}
static uint64_t shn_uint(ShnBits *b){int bits=shn_rice(b,2);return shn_rice(b,bits);}
static int shn_profile_header(Decoder *d,const uint8_t *data,int size){
 if(size<64||memcmp(data,"ajkg",4)||data[4]!=2)return 0;ShnBits b={data,size,40,1};
 if(shn_uint(&b)!=5||shn_uint(&b)!=2||shn_uint(&b)!=256||shn_uint(&b)!=0||shn_uint(&b)!=4||shn_uint(&b)!=0||shn_rice(&b,2)!=9||shn_rice(&b,5)!=44)return 0;
 uint8_t wave[44];for(int i=0;i<44;i++){uint64_t value=shn_rice(&b,8);if(value>255)return 0;wave[i]=value;}
 if(!b.valid||memcmp(wave,"RIFF",4)||memcmp(wave+8,"WAVEfmt ",8)||AV_RL32(wave+16)!=16||AV_RL16(wave+20)!=1||AV_RL16(wave+22)!=2||AV_RL32(wave+24)!=44100||AV_RL32(wave+28)!=176400||AV_RL16(wave+32)!=4||AV_RL16(wave+34)!=16||memcmp(wave+36,"data",4))return 0;
 uint32_t count=AV_RL32(wave+40);if(!count||count%4||count>UINT32_MAX-36||AV_RL32(wave+4)!=count+36)return 0;d->expected_samples=count/4;return 1;
}
// WAV ADPCM accepts exactly one independently framed block per packet.
static int adpcm_profile(int kind,int rate,int channels,int bits,const uint8_t *extra,int size,int align,int bit_rate){
 if((channels!=1&&channels!=2)||(rate!=8000&&rate!=16000&&rate!=22050&&rate!=32000&&rate!=44100&&rate!=48000)||bits!=4||align<8*channels||!bit_rate)return 0;
 if(kind==29){
  static const int16_t coefficients[]={256,0,512,-256,0,0,192,64,240,0,460,-208,392,-232};
  if(size!=32||AV_RL16(extra)!=2+(align-7*channels)*2/channels||AV_RL16(extra+2)!=7)return 0;
  for(int i=0;i<14;i++)if((int16_t)AV_RL16(extra+4+i*2)!=coefficients[i])return 0;
 }else if(size!=2||(align-4*channels)%(4*channels)||AV_RL16(extra)!=1+(align-4*channels)*2/channels)return 0;
 return 1;
}
static int adpcm_block(Decoder *d,const uint8_t *data,int n){
 if(n!=d->block_align)return 0;
 for(int c=0;c<d->channels;c++){
  if(d->id==AV_CODEC_ID_ADPCM_MS){if(data[c]>6||(int16_t)AV_RL16(data+d->channels+2*c)<=0)return 0;}
  else if(data[4*c+2]>88||data[4*c+3])return 0;
 }return 1;
}
// Explicit Ogg Speex header profiles, independently qualified at native rates.
// Empty extradata retains the original headerless16k FLV admission.
static int speex_profile(int rate,int channels,int bits,const uint8_t *extra,int size,int align,int bit_rate){
 if(channels!=1||bits||align||bit_rate)return 0;
 if(!size)return rate==16000;
 if(size!=80||!extra||memcmp(extra,"Speex   ",8)||AV_RL32(extra+28)!=1||AV_RL32(extra+32)!=80||AV_RL32(extra+36)!=rate)return 0;
 const int mode=rate==8000?0:rate==32000?2:-1,frame=rate==8000?160:640;
 return mode>=0&&AV_RL32(extra+40)==mode&&AV_RL32(extra+44)==4&&AV_RL32(extra+48)==1&&AV_RL32(extra+52)==UINT32_MAX&&AV_RL32(extra+56)==frame&&!AV_RL32(extra+60)&&AV_RL32(extra+64)==1&&!AV_RL32(extra+68)&&!AV_RL32(extra+72)&&!AV_RL32(extra+76);
}
Decoder *mc_create_config_v2(int kind,int rate,int channels,int bits,const uint8_t *extra,int size,int block_align,int bit_rate) {
 static const enum AVCodecID ids[]={AV_CODEC_ID_AC3,AV_CODEC_ID_EAC3,AV_CODEC_ID_DTS,AV_CODEC_ID_TRUEHD,AV_CODEC_ID_MLP,AV_CODEC_ID_DTS,AV_CODEC_ID_AAC,AV_CODEC_ID_OPUS,AV_CODEC_ID_VORBIS,AV_CODEC_ID_FLAC,AV_CODEC_ID_ALAC,AV_CODEC_ID_MP3,AV_CODEC_ID_PCM_S16LE,AV_CODEC_ID_PCM_S24LE,AV_CODEC_ID_PCM_S32LE,AV_CODEC_ID_PCM_F32LE,AV_CODEC_ID_PCM_F64LE,AV_CODEC_ID_MP1,AV_CODEC_ID_MP2,AV_CODEC_ID_WMAV1,AV_CODEC_ID_WMAV2,AV_CODEC_ID_APE,AV_CODEC_ID_WAVPACK,AV_CODEC_ID_TTA,AV_CODEC_ID_WMAPRO,AV_CODEC_ID_WMALOSSLESS,AV_CODEC_ID_WMAVOICE,AV_CODEC_ID_TAK,AV_CODEC_ID_SHORTEN,AV_CODEC_ID_ADPCM_MS,AV_CODEC_ID_ADPCM_IMA_WAV,AV_CODEC_ID_PCM_ALAW,AV_CODEC_ID_PCM_MULAW,AV_CODEC_ID_GSM,AV_CODEC_ID_GSM_MS,AV_CODEC_ID_SPEEX,AV_CODEC_ID_AMR_NB,AV_CODEC_ID_AMR_WB,AV_CODEC_ID_PCM_U8,AV_CODEC_ID_PCM_S8,AV_CODEC_ID_ADPCM_IMA_QT,AV_CODEC_ID_ADPCM_G726,AV_CODEC_ID_ADPCM_G726LE};
 if(kind<0||kind>=sizeof(ids)/sizeof(ids[0])||rate<8000||rate>192000||channels<0||channels>8||bits<0||bits>64||size<0||size>65536||(size&&!extra)||block_align<0||block_align>65536||bit_rate<0||bit_rate>10000000)return 0;
 if((kind==19||kind==20)&&(channels<1||channels>2||(rate!=8000&&rate!=16000&&rate!=22050&&rate!=32000&&rate!=44100&&rate!=48000)||!block_align||!bit_rate||(kind==19?size!=4:size!=10)))return 0;
#ifdef DEMUXE_DTS_FULL
 if(kind==2)return 0;
#else
 if(kind==5)return 0;
#endif
 if(kind==21&&(channels<1||channels>2||(rate!=44100&&rate!=48000&&rate!=96000)||(bits!=16&&bits!=24)||size!=6||((extra[0]|(extra[1]<<8))<3930)||((extra[0]|(extra[1]<<8))>3990)))return 0;
 if(kind==23&&(size!=22||AV_RL32(extra)!=AV_RL32("TTA1")||AV_RL16(extra+4)!=1||(channels!=1&&channels!=2&&channels!=6)||(rate!=44100&&rate!=48000)||(bits!=16&&bits!=24)||AV_RL16(extra+6)!=channels||AV_RL16(extra+8)!=bits||AV_RL32(extra+10)!=rate||!AV_RL32(extra+14)||(av_crc(av_crc_get_table(AV_CRC_32_IEEE_LE),0xffffffff,extra,18)^0xffffffff)!=AV_RL32(extra+18)))return 0;
 if((kind==29||kind==30)&&!adpcm_profile(kind,rate,channels,bits,extra,size,block_align,bit_rate))return 0;
 if((kind==41||kind==42)&&(rate!=8000||channels!=1||bits<2||bits>5||size||block_align||bit_rate!=8000*bits))return 0;
 if(kind==40&&((rate!=44100&&rate!=48000)||(channels!=1&&channels!=2)||bits!=4||size||block_align!=34*channels||bit_rate))return 0;
 if((kind==38||kind==39)&&((rate!=44100&&rate!=48000&&rate!=96000)||(channels!=1&&channels!=2)||bits!=8||size||block_align||bit_rate))return 0;
 if(kind==35&&!speex_profile(rate,channels,bits,extra,size,block_align,bit_rate))return 0;
 if(kind>=36&&kind<=37&&((kind==36?rate!=8000:rate!=16000)||channels!=1||bits||size||block_align||bit_rate))return 0;
 if(kind==31||kind==32){if((rate!=8000&&rate!=16000)||(channels!=1&&channels!=2)||bits!=8||size||block_align!=channels||bit_rate!=rate*channels*8)return 0;}
 if(kind==33&&(rate!=8000||channels!=1||bits||size||block_align!=33||bit_rate!=13200))return 0;
 if(kind==34&&(rate!=8000||channels!=1||bits||size!=2||AV_RL16(extra)!=320||block_align!=65||bit_rate!=13000))return 0;
 if(kind==28&&(rate!=44100||channels!=2||bits!=16||size||block_align||bit_rate))return 0;
 if(kind==27&&(!tak_profile(rate,channels,bits,extra,size)||block_align||bit_rate))return 0;
 // Append-only ABI kinds. WMA advanced profiles require exact ASF codec block framing.
 if(kind>=24&&kind<=26){
  if(!block_align||!bit_rate)return 0;
  if(kind==26){if((rate!=8000&&rate!=16000)||channels!=1||bits!=16||size!=46)return 0;}
  else {
   if(size!=18||AV_RL16(extra)!=bits)return 0;
   if(kind==25){if(channels!=2||!((rate==44100&&(bits==16||bits==24))||(rate==48000&&bits==24)))return 0;}
   else if(!((rate==44100&&((channels==6&&(bits==16||bits==24))||(channels==2&&bits==24)))||(rate==48000&&(channels==2||channels==6||channels==8)&&bits==24)||(rate==96000&&(channels==2||channels==6)&&bits==24)||(rate==16000&&channels==1&&bits==16)||(rate==22050&&channels==1&&bits==16)))return 0;
   uint32_t mask=AV_RL32(extra+2),expected=channels==1?4:channels==2?3:channels==6?63:1599;
   if(mask!=expected)return 0;
  }
 }
 Decoder *d=av_mallocz(sizeof(*d)); if(!d)return 0;
 d->id=ids[kind];d->rate=rate;d->channels=channels;d->bits=bits;d->block_align=block_align;d->bit_rate=bit_rate;
 if(size){d->extra=av_memdup(extra,size);if(!d->extra){mc_destroy(d);return 0;}d->extra_size=size;}
 d->core_only=kind==2;
 av_log_set_level(AV_LOG_QUIET);d->f=av_frame_alloc();d->p=av_packet_alloc();
 if(!d->f||!d->p||open_decoder(d)<0){mc_destroy(d);return 0;}return d;
}
Decoder *mc_create_config(int kind,int rate,int channels,int bits,const uint8_t *extra,int size){return mc_create_config_v2(kind,rate,channels,bits,extra,size,0,0);}
Decoder *mc_create(int kind){return mc_create_config(kind,48000,0,0,0,0);}
int mc_configure(Decoder *d,int rate){if(!d||rate<=0)return AVERROR(EINVAL);d->c->pkt_timebase=(AVRational){1,rate};return 0;}
int mc_decode(Decoder *d,const uint8_t *data,int n,double pts){
 if(!d||n<=0||n>1048576)return AVERROR(EINVAL);
 if(d->id==AV_CODEC_ID_ADPCM_G726||d->id==AV_CODEC_ID_ADPCM_G726LE){int samples=n*8/d->bits;if(n*8%d->bits||samples>65536||!(pts>=0&&pts<=9007199254740991.0-samples)||pts!=(int64_t)pts)return AVERROR(EINVAL);d->expected_samples=samples;}
 if(d->id==AV_CODEC_ID_ADPCM_IMA_QT){if(n!=34*d->channels||!(pts>=0&&pts<=9007199254740991.0-64)||pts!=(int64_t)pts)return AVERROR(EINVAL);for(int c=0;c<d->channels;c++)if((AV_RB16(data+34*c)&127)>88)return AVERROR(EINVAL);}
 if(d->id==AV_CODEC_ID_PCM_U8||d->id==AV_CODEC_ID_PCM_S8){if(n>65536||n%d->channels||!(pts>=0&&pts<=9007199254740991.0-n/d->channels)||pts!=(int64_t)pts)return AVERROR(EINVAL);}
 if((d->id==AV_CODEC_ID_ADPCM_MS||d->id==AV_CODEC_ID_ADPCM_IMA_WAV)&&!adpcm_block(d,data,n))return AVERROR(EINVAL);
 if(d->id==AV_CODEC_ID_SPEEX||d->id==AV_CODEC_ID_AMR_NB||d->id==AV_CODEC_ID_AMR_WB){
  const int speex_frame=d->id==AV_CODEC_ID_SPEEX&&d->extra_size?(d->rate==8000?160:640):0;
  if(!(pts>=(speex_frame?1-speex_frame:0)&&pts<=9007199254740991.0-speex_frame)||pts!=(int64_t)pts)return AVERROR(EINVAL);
  if(d->id==AV_CODEC_ID_SPEEX){if(n>2048)return AVERROR(EINVAL);}
  else{
   // One quality=1 ordinary speech frame; SID retains its explicit decoder
   // unsupported-feature error. The adapter owns the requested mode whitelist.
   static const int nb_sizes[]={13,14,16,18,20,21,27,32};
   static const int wb_sizes[]={18,24,33,37,41,47,51,59,61};
   const int nb=d->id==AV_CODEC_ID_AMR_NB,mode=data[0]>>3,sid=nb?68:76;
   if(!(pts<=9007199254740991.0-(nb?160:320)))return AVERROR(EINVAL);
   if(!((!(data[0]&0x83)&&(data[0]&4)&&mode<(nb?8:9)&&n==(nb?nb_sizes[mode]:wb_sizes[mode]))||(data[0]==sid&&n==6)))return AVERROR(EINVAL);
  }
 }
 if(d->id==AV_CODEC_ID_PCM_ALAW||d->id==AV_CODEC_ID_PCM_MULAW||d->id==AV_CODEC_ID_GSM||d->id==AV_CODEC_ID_GSM_MS){
  if(!(pts>=0&&pts<=9007199254740991.0)||pts!=(int64_t)pts)return AVERROR(EINVAL);
  if((d->id==AV_CODEC_ID_PCM_ALAW||d->id==AV_CODEC_ID_PCM_MULAW)?(n>4096||n%d->channels):(n!=d->block_align||(d->id==AV_CODEC_ID_GSM&&(data[0]>>4)!=0xd)))return AVERROR(EINVAL);
 }
 if(d->id==AV_CODEC_ID_SHORTEN&&(n>1024||pts!=0||(!d->have_anchor&&!shn_profile_header(d,data,n))))return AVERROR(EINVAL);
 if((d->id==AV_CODEC_ID_WMAV1||d->id==AV_CODEC_ID_WMAV2||d->id==AV_CODEC_ID_WMAPRO||d->id==AV_CODEC_ID_WMALOSSLESS||d->id==AV_CODEC_ID_WMAVOICE)&&n!=d->block_align)return AVERROR(EINVAL);
 if(d->id==AV_CODEC_ID_APE){if(n<8)return AVERROR(EINVAL);uint32_t blocks=(uint32_t)data[0]|((uint32_t)data[1]<<8)|((uint32_t)data[2]<<16)|((uint32_t)data[3]<<24);if(!blocks||blocks>294912)return AVERROR(EINVAL);}
 av_packet_unref(d->p);int r=av_new_packet(d->p,n);if(r<0)return r;
 memcpy(d->p->data,data,n);d->p->pts=d->p->dts=d->id==AV_CODEC_ID_SHORTEN?AV_NOPTS_VALUE:(int64_t)pts;
 r=avcodec_send_packet(d->c,d->p);av_packet_unref(d->p);
 if(r>=0&&d->id==AV_CODEC_ID_SHORTEN&&!d->have_anchor){d->anchor_pts=0;d->have_anchor=1;}
 if(r>=0&&!d->have_anchor&&(d->id==AV_CODEC_ID_WMAPRO||d->id==AV_CODEC_ID_WMALOSSLESS||d->id==AV_CODEC_ID_WMAVOICE)){d->anchor_pts=(int64_t)pts;d->have_anchor=1;}
 return r;
}
int mc_frame(Decoder *d){
 av_frame_unref(d->f);d->timestamp_origin=0;int r=avcodec_receive_frame(d->c,d->f);
 if(r>=0&&(d->id==AV_CODEC_ID_ADPCM_G726||d->id==AV_CODEC_ID_ADPCM_G726LE)){if(d->f->sample_rate!=8000||d->f->ch_layout.nb_channels!=1||d->f->format!=AV_SAMPLE_FMT_S16||d->f->ch_layout.order!=AV_CHANNEL_ORDER_NATIVE||d->f->ch_layout.u.mask!=4||d->f->nb_samples<=0||d->f->nb_samples!=d->expected_samples||d->f->nb_samples>65536)return AVERROR_INVALIDDATA;}
 if(r>=0&&(d->id==AV_CODEC_ID_PCM_U8||d->id==AV_CODEC_ID_PCM_S8)){if(d->f->sample_rate!=d->rate||d->f->ch_layout.nb_channels!=d->channels||d->f->format!=AV_SAMPLE_FMT_U8||d->f->ch_layout.order!=AV_CHANNEL_ORDER_NATIVE||d->f->ch_layout.u.mask!=(d->channels==1?4:3)||d->f->nb_samples<=0||d->f->nb_samples*d->channels>65536)return AVERROR_INVALIDDATA;}
 if(r>=0&&d->id==AV_CODEC_ID_SPEEX&&d->channels==1&&d->f->ch_layout.nb_channels==1&&d->f->ch_layout.order==AV_CHANNEL_ORDER_UNSPEC){
  // Explicit admitted mono header/FLV profile and actual single decoded channel
  // have no channel-order ambiguity. No surround normalization is performed.
  av_channel_layout_uninit(&d->f->ch_layout);av_channel_layout_from_mask(&d->f->ch_layout,AV_CH_LAYOUT_MONO);
 }
 if(r>=0&&(d->id==AV_CODEC_ID_SPEEX||d->id==AV_CODEC_ID_AMR_NB||d->id==AV_CODEC_ID_AMR_WB)){
  if(d->f->sample_rate!=d->rate||d->f->ch_layout.nb_channels!=1||d->f->ch_layout.order!=AV_CHANNEL_ORDER_NATIVE||d->f->ch_layout.u.mask!=4)return AVERROR_INVALIDDATA;
  if(d->id==AV_CODEC_ID_SPEEX?(d->f->format!=AV_SAMPLE_FMT_FLT||(d->extra_size?d->f->nb_samples!=(d->rate==8000?160:640):(d->f->nb_samples!=320&&d->f->nb_samples!=640))):(d->f->format!=AV_SAMPLE_FMT_FLTP||d->f->nb_samples!=(d->id==AV_CODEC_ID_AMR_NB?160:320)))return AVERROR_INVALIDDATA;
 }
 if(r>=0&&(d->id==AV_CODEC_ID_TTA||d->id==AV_CODEC_ID_TAK)&&d->channels==1&&d->f->ch_layout.nb_channels==1&&d->f->ch_layout.order==AV_CHANNEL_ORDER_UNSPEC){
  // The validated TTA1/TAK header declares exactly one channel; its only channel has no ordering ambiguity.
  av_channel_layout_uninit(&d->f->ch_layout);av_channel_layout_from_mask(&d->f->ch_layout,AV_CH_LAYOUT_MONO);
 }
 if(r>=0&&(d->id==AV_CODEC_ID_PCM_ALAW||d->id==AV_CODEC_ID_PCM_MULAW||d->id==AV_CODEC_ID_GSM||d->id==AV_CODEC_ID_GSM_MS)){
  if(d->f->sample_rate!=d->rate||d->f->ch_layout.nb_channels!=d->channels||d->f->format!=AV_SAMPLE_FMT_S16||d->f->ch_layout.order!=AV_CHANNEL_ORDER_NATIVE||d->f->ch_layout.u.mask!=(d->channels==1?4:3)||d->f->nb_samples<=0)return AVERROR_INVALIDDATA;
  if(d->id==AV_CODEC_ID_GSM?d->f->nb_samples!=160:d->id==AV_CODEC_ID_GSM_MS?d->f->nb_samples!=320:d->f->nb_samples*d->channels>4096)return AVERROR_INVALIDDATA;
 }
 if(r>=0&&d->id==AV_CODEC_ID_SHORTEN){
  // SHN has no packet PTS. The embedded RIFF header and decoded block count own
  // this explicit stream clock; no arbitrary packet-offset timestamp is used.
  if(!d->have_anchor||d->f->sample_rate!=44100||d->f->ch_layout.nb_channels!=2||d->c->bits_per_coded_sample!=16||d->f->format!=AV_SAMPLE_FMT_S16P||d->f->nb_samples<1||d->f->nb_samples>256)return AVERROR_INVALIDDATA;
  d->f->pts=d->have_pts?d->next_pts:0;
  if(d->f->pts>INT64_MAX-d->f->nb_samples)return AVERROR(EINVAL);
  if(d->f->pts+d->f->nb_samples>d->expected_samples)return AVERROR_INVALIDDATA;
  d->f->duration=d->f->nb_samples;d->next_pts=d->f->pts+d->f->nb_samples;d->have_pts=1;d->timestamp_origin=2;
 }
 if(r>=0&&(d->id==AV_CODEC_ID_WMAV1||d->id==AV_CODEC_ID_WMAV2||d->id==AV_CODEC_ID_APE||d->id==AV_CODEC_ID_WMAPRO||d->id==AV_CODEC_ID_WMALOSSLESS||d->id==AV_CODEC_ID_WMAVOICE)){
  // WMA drain and APE continuation subframes carry no packet PTS. Use the last
  // validated decoded sample clock; never invent an initial timestamp.
  if(d->f->pts==AV_NOPTS_VALUE){
   if(d->have_pts)d->f->pts=d->next_pts;
   else if(d->have_anchor)d->f->pts=d->anchor_pts;
   else return AVERROR_INVALIDDATA;
   d->timestamp_origin=1;
  }
  if(d->f->nb_samples<=0||d->f->pts>INT64_MAX-d->f->nb_samples)return AVERROR(EINVAL);
  d->next_pts=d->f->pts+d->f->nb_samples;d->have_pts=1;
 }if(r==AVERROR_EOF&&d->id==AV_CODEC_ID_SHORTEN&&d->have_anchor&&d->next_pts!=d->expected_samples)return AVERROR_INVALIDDATA;return r;
}
int mc_flush(Decoder *d){return avcodec_send_packet(d->c,0);}
int mc_reset(Decoder *d,int recreate){
 if(!d||(d->id==AV_CODEC_ID_SHORTEN&&!recreate))return AVERROR(EINVAL);
 av_frame_unref(d->f);av_packet_unref(d->p);d->next_pts=0;d->have_pts=0;d->anchor_pts=0;d->have_anchor=0;d->expected_samples=0;d->timestamp_origin=0;
 if(!recreate){avcodec_flush_buffers(d->c);return 0;}
 AVRational tb=d->c->pkt_timebase;avcodec_free_context(&d->c);int r=open_decoder(d);if(r>=0)d->c->pkt_timebase=tb;return r;
}
// Frame pointers expire at next mc_frame/reset/destroy. Copy before those calls.
double mc_info(Decoder *d,int field){AVFrame *f=d->f;switch(field){
 case 0:return f->nb_samples;case 1:return f->sample_rate;case 2:return f->ch_layout.nb_channels;
 case 3:return f->format;case 4:return f->pts;case 5:return f->duration;
 case 6:return f->ch_layout.order==AV_CHANNEL_ORDER_NATIVE?(double)f->ch_layout.u.mask:-1;
 case 11:return d->timestamp_origin;case 10:return d->c->profile;case 7:return d->c->delay;case 8:return d->c->initial_padding;case 9:return d->id==AV_CODEC_ID_SHORTEN?d->c->bits_per_coded_sample:d->c->bits_per_raw_sample;default:return -1;}}
uint8_t *mc_plane(Decoder *d,int ch){return ch>=0&&ch<d->f->ch_layout.nb_channels?d->f->extended_data[ch]:0;}
