// SPDX-License-Identifier: Apache-2.0
// Restricted IVF decoder used to compare a selected tile/operating point with full decode.
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <assert.h>
#include "aom/aom_decoder.h"
#include "aom/aomdx.h"
static unsigned le32(unsigned char *p){return p[0]|p[1]<<8|p[2]<<16|(unsigned)p[3]<<24;}
int main(int argc,char **argv){
 if(argc!=7)return 2;
 FILE *in=fopen(argv[1],"rb"),*out=fopen(argv[2],"wb");assert(in&&out);
 unsigned char h[32];assert(fread(h,1,32,in)==32);
 aom_codec_ctx_t d; aom_codec_dec_cfg_t cfg={0};cfg.threads=1;
 assert(!aom_codec_dec_init(&d,aom_codec_av1_dx(),&cfg,0));
 assert(!aom_codec_control(&d,AV1_SET_TILE_MODE,(unsigned)atoi(argv[3])));
 assert(!aom_codec_control(&d,AV1_SET_DECODE_TILE_ROW,atoi(argv[4])));
 assert(!aom_codec_control(&d,AV1_SET_DECODE_TILE_COL,atoi(argv[5])));
 assert(!aom_codec_control(&d,AV1D_SET_OPERATING_POINT,atoi(argv[6])));
 assert(!aom_codec_control(&d,AV1D_EXT_TILE_DEBUG,(unsigned)atoi(argv[3])));
 unsigned frames=0;
 while(fread(h,1,12,in)==12){unsigned n=le32(h);if(n>16*1024*1024)return 3;unsigned char *p=malloc(n);assert(p);assert(fread(p,1,n,in)==n);
  if(aom_codec_decode(&d,p,n,NULL)){fprintf(stderr,"decode: %s %s\n",aom_codec_error(&d),aom_codec_error_detail(&d));free(p);aom_codec_destroy(&d);fclose(in);fclose(out);return 4;}free(p);
  aom_codec_iter_t it=NULL;aom_image_t *img;
  while((img=aom_codec_get_frame(&d,&it))){printf("%u %u %u %u\n",frames++,img->d_w,img->d_h,img->bit_depth);assert(img->bit_depth==8);
   for(int c=0;c<3;c++){int w=c?(img->d_w+1)/2:img->d_w,hh=c?(img->d_h+1)/2:img->d_h;for(int y=0;y<hh;y++){if(img->fmt&AOM_IMG_FMT_HIGHBITDEPTH){uint16_t *row=(uint16_t *)(img->planes[c]+y*img->stride[c]);for(int x=0;x<w;x++)fputc(row[x],out);}else assert(fwrite(img->planes[c]+y*img->stride[c],1,w,out)==(unsigned)w);}}
  }
 }
 aom_codec_destroy(&d);fclose(in);fclose(out);return 0;
}
