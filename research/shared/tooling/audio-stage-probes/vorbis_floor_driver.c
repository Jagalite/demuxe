/* SPDX-License-Identifier: Apache-2.0 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ogg/ogg.h>
#include <vorbis/codec.h>
int main(int argc,char **argv){
 if(argc!=2)return 2;FILE*f=fopen(argv[1],"rb");if(!f)return 3;
 ogg_sync_state sync;ogg_stream_state stream;ogg_page page;ogg_packet packet;
 vorbis_info info;vorbis_comment comment;vorbis_dsp_state dsp;vorbis_block block;
 ogg_sync_init(&sync);vorbis_info_init(&info);vorbis_comment_init(&comment);
 int initialized=0,headers=0,ready=0,error=0;
 while(!error){
  char*b=ogg_sync_buffer(&sync,4096);size_t n=fread(b,1,4096,f);ogg_sync_wrote(&sync,n);
  if(!n)break;int result;
  while((result=ogg_sync_pageout(&sync,&page))!=0){
   if(result<0){error=4;break;}
   if(!initialized){ogg_stream_init(&stream,ogg_page_serialno(&page));initialized=1;}
   if(ogg_stream_pagein(&stream,&page)<0){error=5;break;}
   while((result=ogg_stream_packetout(&stream,&packet))!=0){
    if(result<0){error=6;break;}
    if(headers<3){if(vorbis_synthesis_headerin(&info,&comment,&packet)){error=7;break;}headers++;if(headers==3){if(vorbis_synthesis_init(&dsp,&info)){error=8;break;}vorbis_block_init(&dsp,&block);ready=1;}}
    else{if(vorbis_synthesis(&block,&packet)){error=9;break;}vorbis_synthesis_blockin(&dsp,&block);float**pcm;int count;while((count=vorbis_synthesis_pcmout(&dsp,&pcm))>0)vorbis_synthesis_read(&dsp,count);}
   }
  }
 }
 if(ready){vorbis_block_clear(&block);vorbis_dsp_clear(&dsp);}if(initialized)ogg_stream_clear(&stream);vorbis_comment_clear(&comment);vorbis_info_clear(&info);ogg_sync_clear(&sync);fclose(f);return error?error:headers==3?0:10;
}
