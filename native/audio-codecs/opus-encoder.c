// SPDX-License-Identifier: Apache-2.0
#include <opus.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>
#define BLOCK 960
#define AGAIN -6
#define END -541478725
/* The public PCM contract is interleaved left-justified signed24 at48kHz.
 * Packet timing includes startup delay and a short final duration; MP4 dOps
 * and edit-list handling is owned by the container provider. */
typedef struct {
 OpusEncoder *codec;
 int channels, preskip, bytes, duration, pending, ended, partial, prepared;
 int64_t samples, coded, pts;
 int32_t input[BLOCK*2]; float pcm[BLOCK*2];
 unsigned char packet[1275], header[19];
} Encoder;
void ae_destroy(Encoder *e) { if(e) { opus_encoder_destroy(e->codec); free(e); } }
Encoder *ae_create(int channels, int level) {
 if((channels!=1&&channels!=2)||level<0||level>12)return NULL;
 Encoder *e=calloc(1,sizeof(*e)); if(!e)return NULL;
 int error=0;e->channels=channels;e->codec=opus_encoder_create(48000,channels,OPUS_APPLICATION_AUDIO,&error);
 if(error!=OPUS_OK||!e->codec){ae_destroy(e);return NULL;}
 if(opus_encoder_ctl(e->codec,OPUS_SET_BITRATE(channels==1?128000:192000))!=OPUS_OK||
    opus_encoder_ctl(e->codec,OPUS_SET_COMPLEXITY(10))!=OPUS_OK||
    opus_encoder_ctl(e->codec,OPUS_GET_LOOKAHEAD(&e->preskip))!=OPUS_OK){ae_destroy(e);return NULL;}
 memcpy(e->header,"OpusHead",8);e->header[8]=1;e->header[9]=channels;
 e->header[10]=e->preskip&255;e->header[11]=e->preskip>>8;
 e->header[12]=0x80;e->header[13]=0xbb; /*48000, little endian*/
 return e;
}
int ae_size(Encoder *e) { (void)e;return BLOCK; }
int32_t *ae_input(Encoder *e) { if(e->ended||e->partial)return NULL;e->prepared=1;return e->input; }
static int emit(Encoder *e,int duration) {
 int n=opus_encode_float(e->codec,e->pcm,BLOCK,e->packet,sizeof(e->packet));
 if(n<0)return n;
 e->bytes=n;e->duration=duration;e->pts=e->coded-e->preskip;e->coded+=duration;e->pending=1;return 0;
}
int ae_send(Encoder *e,int n) {
 if(n<0||n>BLOCK||e->pending||e->ended||(n&&(!e->prepared||e->partial)))return -22;
 if(n){
  for(int i=0;i<n*e->channels;i++)e->pcm[i]=e->input[i]/2147483648.0f;
  memset(e->pcm+n*e->channels,0,(BLOCK-n)*e->channels*sizeof(float));
  e->samples+=n;e->partial=n<BLOCK;e->prepared=0;
  int64_t remaining=e->samples+e->preskip-e->coded;
  return emit(e,remaining<BLOCK?(int)remaining:BLOCK);
 }
 e->ended=1;
 if(e->samples&&e->coded<e->samples+e->preskip){
  memset(e->pcm,0,sizeof(e->pcm));
  return emit(e,(int)(e->samples+e->preskip-e->coded));
 }
 return 0;
}
int ae_receive(Encoder *e) { if(e->pending){e->pending=0;return 0;}return e->ended?END:AGAIN; }
unsigned char *ae_data(Encoder *e) { return e->packet; }
int ae_bytes(Encoder *e) { return e->bytes; }
double ae_pts(Encoder *e) { return (double)e->pts; }
int ae_duration(Encoder *e) { return e->duration; }
unsigned char *ae_header(Encoder *e) { return e->header; }
int ae_header_size(Encoder *e) { (void)e;return 19; }
int ae_preskip(Encoder *e) { return e->preskip; }
