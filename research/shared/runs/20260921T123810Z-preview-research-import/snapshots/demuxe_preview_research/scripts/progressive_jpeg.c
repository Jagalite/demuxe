/* SPDX-License-Identifier: Apache-2.0
 * Native libjpeg progressive delivery feasibility screen. Whole file is resident
 * before timing. bytes_consumed means parser position, NOT observed network bytes.
 * Fixture-only utility: libjpeg default fatal-error handler terminates this process.
 */
#define _POSIX_C_SOURCE 200809L
#include <stdio.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <jpeglib.h>
static double ms(void){struct timespec t;clock_gettime(CLOCK_MONOTONIC,&t);return t.tv_sec*1000.0+t.tv_nsec/1e6;}
static void read_rows(struct jpeg_decompress_struct *c,unsigned char *out){
 size_t stride=(size_t)c->output_width*c->output_components;
 while(c->output_scanline<c->output_height){JSAMPROW row=out+(size_t)c->output_scanline*stride;if(jpeg_read_scanlines(c,&row,1)!=1){fprintf(stderr,"unexpected suspended memory input\n");exit(3);}}
}
static void save(const char *path,const unsigned char *b,size_t n){FILE *f=fopen(path,"wb");if(!f||fwrite(b,1,n,f)!=n){perror("save");exit(2);}fclose(f);}
int main(int argc,char **argv){
 if(argc!=5){fprintf(stderr,"usage: input.jpg progressive|final first.rgb final.rgb\n");return 2;}
 FILE *f=fopen(argv[1],"rb");if(!f){perror("input");return 2;}fseek(f,0,SEEK_END);long size=ftell(f);rewind(f);
 if(size<=0||size>100000000){fclose(f);return 2;}unsigned char *data=malloc((size_t)size);if(!data)return 2;
 if(fread(data,1,(size_t)size,f)!=(size_t)size){fclose(f);free(data);return 2;}fclose(f);
 int progressive=strcmp(argv[2],"progressive")==0;
 struct jpeg_decompress_struct c;struct jpeg_error_mgr e;c.err=jpeg_std_error(&e);
 double start=ms();jpeg_create_decompress(&c);jpeg_mem_src(&c,data,(unsigned long)size);jpeg_read_header(&c,TRUE);
 if(!c.progressive_mode){fprintf(stderr,"expected progressive fixture\n");return 2;}
 c.scale_num=1;c.scale_denom=8;c.out_color_space=JCS_RGB;c.buffered_image=progressive?TRUE:FALSE;
 jpeg_start_decompress(&c);size_t n=(size_t)c.output_width*c.output_height*c.output_components;
 unsigned char *first=malloc(n),*last=malloc(n);if(!first||!last)return 2;
 double first_ms;size_t consumed;int first_scan=1;
 if(progressive){
  jpeg_start_output(&c,1);read_rows(&c,first);jpeg_finish_output(&c);first_ms=ms()-start;consumed=(size_t)size-c.src->bytes_in_buffer;
  while(!jpeg_input_complete(&c)){if(jpeg_consume_input(&c)==JPEG_SUSPENDED){fprintf(stderr,"unexpected suspension\n");return 3;}}
  jpeg_start_output(&c,c.input_scan_number);read_rows(&c,last);jpeg_finish_output(&c);
 }else{
  read_rows(&c,last);memcpy(first,last,n);first_ms=ms()-start;consumed=(size_t)size-c.src->bytes_in_buffer;first_scan=c.input_scan_number;
 }
 jpeg_finish_decompress(&c);double total_ms=ms()-start;
 printf("{\"first_ms\":%.6f,\"total_ms\":%.6f,\"first_bytes_consumed\":%zu,\"total_source_bytes\":%ld,\"first_scan\":%d,\"last_scan\":%d,\"width\":%u,\"height\":%u,\"progressive\":%s}\n",first_ms,total_ms,consumed,size,first_scan,c.input_scan_number,c.output_width,c.output_height,progressive?"true":"false");
 jpeg_destroy_decompress(&c);save(argv[3],first,n);save(argv[4],last,n);free(first);free(last);free(data);return 0;
}
