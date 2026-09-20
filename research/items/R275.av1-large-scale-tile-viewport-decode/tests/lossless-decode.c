// SPDX-License-Identifier: Apache-2.0
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <string.h>
#include "aom/aom_decoder.h"
#include "aom/aomdx.h"
static unsigned le32(unsigned char*p){return(unsigned)p[0]|(unsigned)p[1]<<8|(unsigned)p[2]<<16|(unsigned)p[3]<<24;}
int main(int argc,char**argv){
 if(argc!=6)return 2;int selected=atoi(argv[3]),row=atoi(argv[4]),col=atoi(argv[5]);if(row<0||row>1||col<0||col>1)return 3;
 FILE*in=fopen(argv[1],"rb"),*out=fopen(argv[2],"wb");if(!in||!out)return 4;unsigned char h[32];int rc=0;unsigned char*p=NULL;aom_codec_ctx_t d;aom_codec_dec_cfg_t cfg={0};cfg.threads=1;
 if(fread(h,1,32,in)!=32||memcmp(h,"DKIF",4)){fclose(in);fclose(out);return 5;}if(aom_codec_dec_init(&d,aom_codec_av1_dx(),&cfg,0)){fclose(in);fclose(out);return 6;}
 if(aom_codec_control(&d,AV1_SET_TILE_MODE,1u)||aom_codec_control(&d,AV1_SET_DECODE_TILE_ROW,selected?row:-1)||aom_codec_control(&d,AV1_SET_DECODE_TILE_COL,selected?col:-1)||aom_codec_control(&d,AV1D_EXT_TILE_DEBUG,1u)){rc=7;goto done;}
 for(;;){size_t got=fread(h,1,12,in);if(!got)break;if(got!=12){rc=8;break;}unsigned n=le32(h);if(!n||n>16*1024*1024){rc=9;break;}p=malloc(n);if(!p||fread(p,1,n,in)!=n){rc=10;break;}if(aom_codec_decode(&d,p,n,NULL)){fprintf(stderr,"%s\n",aom_codec_error(&d));rc=11;break;}free(p);p=NULL;aom_codec_iter_t it=NULL;aom_image_t*im;
  while((im=aom_codec_get_frame(&d,&it))){if(im->bit_depth!=8||im->d_w!=(selected?256:512)||im->d_h!=(selected?256:512)){rc=12;goto done;}
   for(int c=0;c<3;c++){unsigned w=c?128:256,hh=w,xoff=selected?0:col*w,yoff=selected?0:row*hh;for(unsigned y=0;y<hh;y++){unsigned char*base=im->planes[c]+(y+yoff)*im->stride[c];if(im->fmt&AOM_IMG_FMT_HIGHBITDEPTH){uint16_t*rowp=(uint16_t*)base;for(unsigned x=0;x<w;x++)fputc(rowp[x+xoff],out);}else if(fwrite(base+xoff,1,w,out)!=w){rc=13;goto done;}}}
  }
 }
 done:free(p);aom_codec_destroy(&d);fclose(in);if(fclose(out))rc=14;return rc;
}
