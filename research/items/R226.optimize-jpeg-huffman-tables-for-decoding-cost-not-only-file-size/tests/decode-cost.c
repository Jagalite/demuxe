// SPDX-License-Identifier: Apache-2.0
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <jpeglib.h>
int main(int argc,char**argv){if(argc!=3)return 2;FILE*f=fopen(argv[1],"rb");if(!f)return 3;fseek(f,0,SEEK_END);long len=ftell(f);rewind(f);unsigned char*encoded=malloc(len);if(fread(encoded,1,len,f)!=(size_t)len)return 4;fclose(f);uint64_t digest=0;int count=atoi(argv[2]);for(int n=0;n<count;n++){struct jpeg_decompress_struct j;struct jpeg_error_mgr err;j.err=jpeg_std_error(&err);jpeg_create_decompress(&j);jpeg_mem_src(&j,encoded,len);jpeg_read_header(&j,TRUE);j.out_color_space=JCS_RGB;jpeg_start_decompress(&j);unsigned char*row=malloc(j.output_width*3);uint64_t h=1469598103934665603ull;while(j.output_scanline<j.output_height){JSAMPROW rows[]={row};jpeg_read_scanlines(&j,rows,1);for(unsigned i=0;i<j.output_width*3;i++)h=(h^row[i])*1099511628211ull;}free(row);jpeg_finish_decompress(&j);jpeg_destroy_decompress(&j);if(n&&digest!=h)return 5;digest=h;}free(encoded);printf("{\"owners\":%d,\"all_destroyed\":true,\"digest\":\"%016llx\"}\n",count,(unsigned long long)digest);return 0;}
