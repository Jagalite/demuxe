// SPDX-License-Identifier: Apache-2.0
// Offline libswscale reference for one planar YUV420P frame.
#include <libavutil/opt.h>
#include <libavutil/pixfmt.h>
#include <libavutil/pixdesc.h>
#include <libavutil/mem.h>
#include <libswscale/swscale.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main(int argc, char **argv) {
    if (argc != 11) {
        fprintf(stderr, "usage: reference raw.yuv rgba.out width height dstw dsth 601|709 limited|full left|center flags\n");
        return 2;
    }
    const int w=atoi(argv[3]), h=atoi(argv[4]), dw=atoi(argv[5]), dh=atoi(argv[6]);
    const int cw=(w+1)/2, ch=(h+1)/2;
    const int cs=strcmp(argv[7],"709")==0 ? SWS_CS_ITU709 : SWS_CS_ITU601;
    const int full=strcmp(argv[8],"full")==0;
    const int pos=strcmp(argv[9],"left")==0 ? AVCHROMA_LOC_LEFT : AVCHROMA_LOC_CENTER;
    const int flags=strcmp(argv[10],"point")==0 ? SWS_POINT :
        strcmp(argv[10],"fullchr")==0 ? SWS_BILINEAR|SWS_FULL_CHR_H_INT|SWS_FULL_CHR_H_INP|SWS_ACCURATE_RND : SWS_BILINEAR;
    const size_t inputSize=(size_t)w*h+2*(size_t)cw*ch, outputSize=(size_t)dw*dh*4;
    unsigned char *input=malloc(inputSize), *output=malloc(outputSize);
    FILE *f=fopen(argv[1],"rb");
    if (!f || fread(input,1,inputSize,f)!=inputSize || fgetc(f)!=EOF) { fprintf(stderr,"invalid input\n"); return 2; }
    fclose(f);
    struct SwsContext *s=sws_alloc_context();
    av_opt_set_int(s,"sws_flags", flags,0);
    av_opt_set_int(s,"srcw",w,0); av_opt_set_int(s,"srch",h,0);
    av_opt_set_int(s,"src_format",AV_PIX_FMT_YUV420P,0);
    av_opt_set_int(s,"dstw",dw,0); av_opt_set_int(s,"dsth",dh,0);
    av_opt_set_int(s,"dst_format",AV_PIX_FMT_RGBA,0);
    int xp,yp;
    if (av_chroma_location_enum_to_pos(&xp,&yp,pos)<0) return 2;
    av_opt_set_int(s,"src_h_chr_pos",xp,0); av_opt_set_int(s,"src_v_chr_pos",yp,0);
    if (sws_setColorspaceDetails(s,sws_getCoefficients(cs),full,sws_getCoefficients(cs),1,0,1<<16,1<<16)<0 || sws_init_context(s,NULL,NULL)<0) {
        fprintf(stderr,"sws init failed\n"); return 2;
    }
    // Match mpv's 32-byte source alignment rule before calling libswscale.
    int srcStride[]={((w+31)/32)*32,((cw+31)/32)*32,((cw+31)/32)*32};
    int dstStride[]={((dw*4+31)/32)*32};
    unsigned char *srcOwned[]={av_mallocz((size_t)srcStride[0]*h),av_mallocz((size_t)srcStride[1]*ch),av_mallocz((size_t)srcStride[2]*ch)};
    unsigned char *dstOwned=av_mallocz((size_t)dstStride[0]*dh);
    const unsigned char *packed[]={input,input+(size_t)w*h,input+(size_t)w*h+(size_t)cw*ch};
    for(int p=0;p<3;p++){int rows=p?ch:h,cols=p?cw:w;for(int row=0;row<rows;row++)memcpy(srcOwned[p]+(size_t)row*srcStride[p],packed[p]+(size_t)row*cols,cols);}
    const unsigned char *src[]={srcOwned[0],srcOwned[1],srcOwned[2]};
    unsigned char *dst[]={dstOwned};
    if (sws_scale(s,src,srcStride,0,h,dst,dstStride)!=dh) return 2;
    for(int row=0;row<dh;row++)memcpy(output+(size_t)row*dw*4,dstOwned+(size_t)row*dstStride[0],dw*4);
    f=fopen(argv[2],"wb");
    if (!f || fwrite(output,1,outputSize,f)!=outputSize) return 2;
    fclose(f); sws_freeContext(s);for(int p=0;p<3;p++)av_free(srcOwned[p]);av_free(dstOwned);free(input); free(output); return 0;
}
