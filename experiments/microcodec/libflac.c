// SPDX-License-Identifier: Apache-2.0
#include <FLAC/stream_encoder.h>
#include <stdlib.h>
#include <string.h>
typedef struct {FLAC__StreamEncoder*c;int32_t input[4096*8];unsigned char output[262144];size_t used;} Encoder;
static FLAC__StreamEncoderWriteStatus write_cb(const FLAC__StreamEncoder*c,const FLAC__byte*b,size_t n,unsigned samples,unsigned frame,void*data){Encoder*e=data;if(e->used+n>sizeof(e->output))return FLAC__STREAM_ENCODER_WRITE_STATUS_FATAL_ERROR;memcpy(e->output+e->used,b,n);e->used+=n;return FLAC__STREAM_ENCODER_WRITE_STATUS_OK;}
void enc_destroy(Encoder*e){if(e){FLAC__stream_encoder_delete(e->c);free(e);}}
Encoder*enc_create(int channels,int level){if(channels<1||channels>8)return 0;Encoder*e=calloc(1,sizeof(*e));if(!e)return 0;e->c=FLAC__stream_encoder_new();if(!e->c){free(e);return 0;}FLAC__stream_encoder_set_channels(e->c,channels);FLAC__stream_encoder_set_bits_per_sample(e->c,24);FLAC__stream_encoder_set_sample_rate(e->c,48000);FLAC__stream_encoder_set_compression_level(e->c,level);FLAC__stream_encoder_set_blocksize(e->c,4096);if(FLAC__stream_encoder_init_stream(e->c,write_cb,0,0,0,e)!=FLAC__STREAM_ENCODER_INIT_STATUS_OK){enc_destroy(e);return 0;}return e;}
int32_t*enc_input(Encoder*e){return e->input;}
int enc_size(Encoder*e){return 4096;}
int enc_encode(Encoder*e,int n){e->used=0;int ok=n?FLAC__stream_encoder_process_interleaved(e->c,e->input,n):FLAC__stream_encoder_finish(e->c);return ok?(int)e->used:-1;}
unsigned char*enc_data(Encoder*e){return e->output;}

unsigned char*enc_header(Encoder*e){return e->output;}
int enc_header_size(Encoder*e){return e->used;}
