// SPDX-License-Identifier: Apache-2.0
#include <aom/aom_encoder.h>
#include <aom/aomcx.h>
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <string.h>
static void ck(aom_codec_err_t e){if(e){fprintf(stderr,"aom error %d\n",e);exit(2);}}
static void le(FILE*f,uint64_t x,int n){for(int i=0;i<n;i++)fputc(x>>(8*i),f);}
int main(int argc,char**argv){if(argc!=4)return 1;FILE*in=fopen(argv[1],"rb"),*out=fopen(argv[2],"wb");if(!in||!out)return 2;int mode=atoi(argv[3]);aom_codec_enc_cfg_t c;ck(aom_codec_enc_config_default(aom_codec_av1_cx(),&c,0));c.g_w=160;c.g_h=96;c.g_timebase.num=1;c.g_timebase.den=24;c.g_threads=1;c.g_lag_in_frames=0;c.rc_end_usage=AOM_Q;c.rc_min_quantizer=0;c.rc_max_quantizer=63;c.kf_mode=AOM_KF_DISABLED;c.kf_min_dist=c.kf_max_dist=999;c.g_limit=12;aom_codec_ctx_t ctx;ck(aom_codec_enc_init(&ctx,aom_codec_av1_cx(),&c,0));ck(aom_codec_control(&ctx,AOME_SET_CPUUSED,6));ck(aom_codec_control(&ctx,AOME_SET_CQ_LEVEL,mode==3?48:24));ck(aom_codec_control(&ctx,AV1E_SET_ENABLE_ORDER_HINT,0));aom_image_t*im=aom_img_alloc(NULL,AOM_IMG_FMT_I420,160,96,1);fwrite("DKIF",1,4,out);le(out,0,2);le(out,32,2);fwrite("AV01",1,4,out);le(out,160,2);le(out,96,2);le(out,24,4);le(out,1,4);le(out,12,4);le(out,0,4);
for(int i=0;i<=12;i++){if(i<12){for(int p=0;p<3;p++)for(int y=0;y<(p?48:96);y++)if(fread(im->planes[p]+y*im->stride[p],1,p?80:160,in)!=(size_t)(p?80:160))return 3;if(i==4&&mode)ck(aom_codec_control(&ctx,AOME_SET_CQ_LEVEL,40));}ck(aom_codec_encode(&ctx,i<12?im:NULL,i,1,i==4&&mode==1?AOM_EFLAG_SET_S_FRAME:0));aom_codec_iter_t it=NULL;const aom_codec_cx_pkt_t*p;while((p=aom_codec_get_cx_data(&ctx,&it)))if(p->kind==AOM_CODEC_CX_FRAME_PKT){le(out,p->data.frame.sz,4);le(out,p->data.frame.pts,8);fwrite(p->data.frame.buf,1,p->data.frame.sz,out);}}
aom_img_free(im);ck(aom_codec_destroy(&ctx));fclose(in);fclose(out);return 0;}
