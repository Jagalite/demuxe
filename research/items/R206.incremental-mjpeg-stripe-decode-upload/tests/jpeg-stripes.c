/* SPDX-License-Identifier: Apache-2.0 */
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <string.h>
#include <setjmp.h>
#include <sys/time.h>
#include <jpeglib.h>
struct error {struct jpeg_error_mgr base;jmp_buf jump;};
static void fail(j_common_ptr c){struct error *e=(struct error*)c->err;(*c->err->output_message)(c);longjmp(e->jump,1);}
static double now(void){struct timeval t;gettimeofday(&t,NULL);return t.tv_sec*1000.0+t.tv_usec/1000.0;}
static void u32(uint32_t n){unsigned char b[4]={n,n>>8,n>>16,n>>24};if(fwrite(b,1,4,stdout)!=4)exit(4);}
int main(int argc,char**argv){if(argc!=3)return 2;FILE*f=fopen(argv[2],"rb");if(!f)return 3;struct jpeg_decompress_struct c;struct error e;memset(&c,0,sizeof(c));c.err=jpeg_std_error(&e.base);e.base.error_exit=fail;if(setjmp(e.jump)){jpeg_destroy_decompress(&c);fclose(f);return 5;}jpeg_create_decompress(&c);jpeg_stdio_src(&c,f);jpeg_read_header(&c,TRUE);c.out_color_space=JCS_RGB;jpeg_start_decompress(&c);if(c.output_width>8192||c.output_height>8192||c.output_components!=3)return 6;unsigned h=strcmp(argv[1],"stripe")==0?64:c.output_height,w=c.output_width,H=c.output_height;size_t row=(size_t)w*3;unsigned char*buf=malloc(row*h);JSAMPROW*ptrs=malloc(sizeof(JSAMPROW)*h);if(!buf||!ptrs)return 7;u32(w);u32(H);fflush(stdout);double first=0,last=0,decode=0,start=now();for(unsigned y=0;y<H;){unsigned n=H-y<h?H-y:h,filled=0;while(filled<n){for(unsigned i=filled;i<n;i++)ptrs[i-filled]=buf+i*row;double t=now();unsigned got=jpeg_read_scanlines(&c,ptrs,n-filled);decode+=now()-t;if(!got)return 8;filled+=got;}if(c.output_scanline==H)last=now();if(!first)first=now();u32(y);u32(n);u32((uint32_t)(n*row));if(fwrite(buf,1,n*row,stdout)!=n*row)return 4;fflush(stdout);y+=n;}jpeg_finish_decompress(&c);u32(UINT32_MAX);u32(0);u32(0);fflush(stdout);fprintf(stderr,"{\"firstStripeUnixMs\":%.3f,\"lastScanlineUnixMs\":%.3f,\"readScanlineMs\":%.3f,\"totalMs\":%.3f,\"decoderBufferBytes\":%zu}\n",first,last,decode,now()-start,row*h);free(ptrs);free(buf);jpeg_destroy_decompress(&c);fclose(f);return 0;}
