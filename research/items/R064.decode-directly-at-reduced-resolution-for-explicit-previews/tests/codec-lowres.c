/* SPDX-License-Identifier: Apache-2.0 */
#include <libavcodec/avcodec.h>
#include <stdio.h>
int main(void){const char *names[]={"mjpeg","mpeg2video","h264","hevc","av1"};printf("{\"libavcodec\":\"%u\",\"max_lowres\":{",avcodec_version());for(int i=0;i<5;i++){const AVCodec*c=avcodec_find_decoder_by_name(names[i]);printf("%s\"%s\":%d",i?",":"",names[i],c?c->max_lowres:-1);}puts("}}");return 0;}
