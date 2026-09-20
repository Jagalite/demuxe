/*
 * H.26L/H.264/AVC/JVT/14496-10/... encoder/decoder
 * Copyright (c) 2003-2010 Michael Niedermayer <michaelni@gmx.at>
 *
 * This file is part of FFmpeg.
 *
 * FFmpeg is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * FFmpeg is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with FFmpeg; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA
 */

#include "libavutil/attributes.h"
#include "h264qpel.h"

#define pixeltmp int16_t
#define BIT_DEPTH 8
#include "h264qpel_template.c"
#undef BIT_DEPTH

#define BIT_DEPTH 9
#include "h264qpel_template.c"
#undef BIT_DEPTH

#define BIT_DEPTH 10
#include "h264qpel_template.c"
#undef BIT_DEPTH
#undef pixeltmp

#define pixeltmp int32_t
#define BIT_DEPTH 12
#include "h264qpel_template.c"
#undef BIT_DEPTH

#define BIT_DEPTH 14
#include "h264qpel_template.c"
#undef BIT_DEPTH



#include <string.h>
#include <stdint.h>
static qpel_mc_func demuxe_original[4][16];
static struct { int valid,n,phase; const uint8_t *ptr; ptrdiff_t stride; uint8_t key[441], output[256]; } demuxe_cache[512];
static int demuxe_calls,demuxe_hits;
void ff_demuxe_cache_reset(void){memset(demuxe_cache,0,sizeof(demuxe_cache));demuxe_calls=demuxe_hits=0;}
int ff_demuxe_cache_calls(void){return demuxe_calls;}
int ff_demuxe_cache_hits(void){return demuxe_hits;}
static void demuxe_run(uint8_t *dst,const uint8_t *src,ptrdiff_t stride,int index,int phase){
 int n=16>>index,k=n+5; uint8_t key[441];unsigned hash=2166136261u;
 demuxe_calls++;
 for(int y=0;y<k;y++){memcpy(key+y*k,src+(y-2)*stride-2,k);for(int x=0;x<k;x++)hash=(hash^key[y*k+x])*16777619u;}
 hash^=(unsigned)(uintptr_t)src;hash^=phase*31+n;unsigned slot=hash&511;
 if(demuxe_cache[slot].valid&&demuxe_cache[slot].n==n&&demuxe_cache[slot].phase==phase&&demuxe_cache[slot].ptr==src&&demuxe_cache[slot].stride==stride&&!memcmp(demuxe_cache[slot].key,key,k*k)){
  demuxe_hits++;for(int y=0;y<n;y++)memcpy(dst+y*stride,demuxe_cache[slot].output+y*n,n);return;
 }
 demuxe_original[index][phase](dst,src,stride);
 demuxe_cache[slot].valid=1;demuxe_cache[slot].n=n;demuxe_cache[slot].phase=phase;demuxe_cache[slot].ptr=src;demuxe_cache[slot].stride=stride;memcpy(demuxe_cache[slot].key,key,k*k);
 for(int y=0;y<n;y++)memcpy(demuxe_cache[slot].output+y*n,dst+y*stride,n);
}
static void demuxe_0_1(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,0,1);}
static void demuxe_0_2(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,0,2);}
static void demuxe_0_3(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,0,3);}
static void demuxe_0_4(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,0,4);}
static void demuxe_0_5(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,0,5);}
static void demuxe_0_6(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,0,6);}
static void demuxe_0_7(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,0,7);}
static void demuxe_0_8(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,0,8);}
static void demuxe_0_9(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,0,9);}
static void demuxe_0_10(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,0,10);}
static void demuxe_0_11(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,0,11);}
static void demuxe_0_12(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,0,12);}
static void demuxe_0_13(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,0,13);}
static void demuxe_0_14(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,0,14);}
static void demuxe_0_15(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,0,15);}
static void demuxe_1_1(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,1,1);}
static void demuxe_1_2(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,1,2);}
static void demuxe_1_3(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,1,3);}
static void demuxe_1_4(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,1,4);}
static void demuxe_1_5(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,1,5);}
static void demuxe_1_6(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,1,6);}
static void demuxe_1_7(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,1,7);}
static void demuxe_1_8(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,1,8);}
static void demuxe_1_9(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,1,9);}
static void demuxe_1_10(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,1,10);}
static void demuxe_1_11(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,1,11);}
static void demuxe_1_12(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,1,12);}
static void demuxe_1_13(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,1,13);}
static void demuxe_1_14(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,1,14);}
static void demuxe_1_15(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,1,15);}
static void demuxe_2_1(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,2,1);}
static void demuxe_2_2(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,2,2);}
static void demuxe_2_3(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,2,3);}
static void demuxe_2_4(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,2,4);}
static void demuxe_2_5(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,2,5);}
static void demuxe_2_6(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,2,6);}
static void demuxe_2_7(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,2,7);}
static void demuxe_2_8(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,2,8);}
static void demuxe_2_9(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,2,9);}
static void demuxe_2_10(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,2,10);}
static void demuxe_2_11(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,2,11);}
static void demuxe_2_12(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,2,12);}
static void demuxe_2_13(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,2,13);}
static void demuxe_2_14(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,2,14);}
static void demuxe_2_15(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,2,15);}
static void demuxe_3_1(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,3,1);}
static void demuxe_3_2(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,3,2);}
static void demuxe_3_3(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,3,3);}
static void demuxe_3_4(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,3,4);}
static void demuxe_3_5(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,3,5);}
static void demuxe_3_6(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,3,6);}
static void demuxe_3_7(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,3,7);}
static void demuxe_3_8(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,3,8);}
static void demuxe_3_9(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,3,9);}
static void demuxe_3_10(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,3,10);}
static void demuxe_3_11(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,3,11);}
static void demuxe_3_12(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,3,12);}
static void demuxe_3_13(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,3,13);}
static void demuxe_3_14(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,3,14);}
static void demuxe_3_15(uint8_t*d,const uint8_t*s,ptrdiff_t stride){demuxe_run(d,s,stride,3,15);}

av_cold void ff_h264qpel_init(H264QpelContext *c, int bit_depth)
{
#undef FUNCC
#define FUNCC(f, depth) f ## _ ## depth ## _c

#define dspfunc2(PFX, IDX, NUM, depth)                                  \
    c->PFX ## _pixels_tab[IDX][ 0] = FUNCC(PFX ## NUM ## _mc00, depth); \
    c->PFX ## _pixels_tab[IDX][ 1] = FUNCC(PFX ## NUM ## _mc10, depth); \
    c->PFX ## _pixels_tab[IDX][ 2] = FUNCC(PFX ## NUM ## _mc20, depth); \
    c->PFX ## _pixels_tab[IDX][ 3] = FUNCC(PFX ## NUM ## _mc30, depth); \
    c->PFX ## _pixels_tab[IDX][ 4] = FUNCC(PFX ## NUM ## _mc01, depth); \
    c->PFX ## _pixels_tab[IDX][ 5] = FUNCC(PFX ## NUM ## _mc11, depth); \
    c->PFX ## _pixels_tab[IDX][ 6] = FUNCC(PFX ## NUM ## _mc21, depth); \
    c->PFX ## _pixels_tab[IDX][ 7] = FUNCC(PFX ## NUM ## _mc31, depth); \
    c->PFX ## _pixels_tab[IDX][ 8] = FUNCC(PFX ## NUM ## _mc02, depth); \
    c->PFX ## _pixels_tab[IDX][ 9] = FUNCC(PFX ## NUM ## _mc12, depth); \
    c->PFX ## _pixels_tab[IDX][10] = FUNCC(PFX ## NUM ## _mc22, depth); \
    c->PFX ## _pixels_tab[IDX][11] = FUNCC(PFX ## NUM ## _mc32, depth); \
    c->PFX ## _pixels_tab[IDX][12] = FUNCC(PFX ## NUM ## _mc03, depth); \
    c->PFX ## _pixels_tab[IDX][13] = FUNCC(PFX ## NUM ## _mc13, depth); \
    c->PFX ## _pixels_tab[IDX][14] = FUNCC(PFX ## NUM ## _mc23, depth); \
    c->PFX ## _pixels_tab[IDX][15] = FUNCC(PFX ## NUM ## _mc33, depth)

#define SET_QPEL(depth)                         \
    dspfunc2(put_h264_qpel, 0, 16, depth);      \
    dspfunc2(put_h264_qpel, 1,  8, depth);      \
    dspfunc2(put_h264_qpel, 2,  4, depth);      \
    dspfunc2(put_h264_qpel, 3,  2, depth);      \
    dspfunc2(avg_h264_qpel, 0, 16, depth);      \
    dspfunc2(avg_h264_qpel, 1,  8, depth);      \
    dspfunc2(avg_h264_qpel, 2,  4, depth)

    switch (bit_depth) {
    default:
        SET_QPEL(8);
        break;
    case 9:
        SET_QPEL(9);
        break;
    case 10:
        SET_QPEL(10);
        break;
    case 12:
        SET_QPEL(12);
        break;
    case 14:
        SET_QPEL(14);
        break;
    }

#if ARCH_AARCH64
    ff_h264qpel_init_aarch64(c, bit_depth);
#elif ARCH_ARM
    ff_h264qpel_init_arm(c, bit_depth);
#elif ARCH_PPC
    ff_h264qpel_init_ppc(c, bit_depth);
#elif ARCH_X86
    ff_h264qpel_init_x86(c, bit_depth);
#elif ARCH_MIPS
    ff_h264qpel_init_mips(c, bit_depth);
#elif ARCH_LOONGARCH64
    ff_h264qpel_init_loongarch(c, bit_depth);
#endif

if(bit_depth==8){
demuxe_original[0][1]=c->put_h264_qpel_pixels_tab[0][1];c->put_h264_qpel_pixels_tab[0][1]=demuxe_0_1;
demuxe_original[0][2]=c->put_h264_qpel_pixels_tab[0][2];c->put_h264_qpel_pixels_tab[0][2]=demuxe_0_2;
demuxe_original[0][3]=c->put_h264_qpel_pixels_tab[0][3];c->put_h264_qpel_pixels_tab[0][3]=demuxe_0_3;
demuxe_original[0][4]=c->put_h264_qpel_pixels_tab[0][4];c->put_h264_qpel_pixels_tab[0][4]=demuxe_0_4;
demuxe_original[0][5]=c->put_h264_qpel_pixels_tab[0][5];c->put_h264_qpel_pixels_tab[0][5]=demuxe_0_5;
demuxe_original[0][6]=c->put_h264_qpel_pixels_tab[0][6];c->put_h264_qpel_pixels_tab[0][6]=demuxe_0_6;
demuxe_original[0][7]=c->put_h264_qpel_pixels_tab[0][7];c->put_h264_qpel_pixels_tab[0][7]=demuxe_0_7;
demuxe_original[0][8]=c->put_h264_qpel_pixels_tab[0][8];c->put_h264_qpel_pixels_tab[0][8]=demuxe_0_8;
demuxe_original[0][9]=c->put_h264_qpel_pixels_tab[0][9];c->put_h264_qpel_pixels_tab[0][9]=demuxe_0_9;
demuxe_original[0][10]=c->put_h264_qpel_pixels_tab[0][10];c->put_h264_qpel_pixels_tab[0][10]=demuxe_0_10;
demuxe_original[0][11]=c->put_h264_qpel_pixels_tab[0][11];c->put_h264_qpel_pixels_tab[0][11]=demuxe_0_11;
demuxe_original[0][12]=c->put_h264_qpel_pixels_tab[0][12];c->put_h264_qpel_pixels_tab[0][12]=demuxe_0_12;
demuxe_original[0][13]=c->put_h264_qpel_pixels_tab[0][13];c->put_h264_qpel_pixels_tab[0][13]=demuxe_0_13;
demuxe_original[0][14]=c->put_h264_qpel_pixels_tab[0][14];c->put_h264_qpel_pixels_tab[0][14]=demuxe_0_14;
demuxe_original[0][15]=c->put_h264_qpel_pixels_tab[0][15];c->put_h264_qpel_pixels_tab[0][15]=demuxe_0_15;
demuxe_original[1][1]=c->put_h264_qpel_pixels_tab[1][1];c->put_h264_qpel_pixels_tab[1][1]=demuxe_1_1;
demuxe_original[1][2]=c->put_h264_qpel_pixels_tab[1][2];c->put_h264_qpel_pixels_tab[1][2]=demuxe_1_2;
demuxe_original[1][3]=c->put_h264_qpel_pixels_tab[1][3];c->put_h264_qpel_pixels_tab[1][3]=demuxe_1_3;
demuxe_original[1][4]=c->put_h264_qpel_pixels_tab[1][4];c->put_h264_qpel_pixels_tab[1][4]=demuxe_1_4;
demuxe_original[1][5]=c->put_h264_qpel_pixels_tab[1][5];c->put_h264_qpel_pixels_tab[1][5]=demuxe_1_5;
demuxe_original[1][6]=c->put_h264_qpel_pixels_tab[1][6];c->put_h264_qpel_pixels_tab[1][6]=demuxe_1_6;
demuxe_original[1][7]=c->put_h264_qpel_pixels_tab[1][7];c->put_h264_qpel_pixels_tab[1][7]=demuxe_1_7;
demuxe_original[1][8]=c->put_h264_qpel_pixels_tab[1][8];c->put_h264_qpel_pixels_tab[1][8]=demuxe_1_8;
demuxe_original[1][9]=c->put_h264_qpel_pixels_tab[1][9];c->put_h264_qpel_pixels_tab[1][9]=demuxe_1_9;
demuxe_original[1][10]=c->put_h264_qpel_pixels_tab[1][10];c->put_h264_qpel_pixels_tab[1][10]=demuxe_1_10;
demuxe_original[1][11]=c->put_h264_qpel_pixels_tab[1][11];c->put_h264_qpel_pixels_tab[1][11]=demuxe_1_11;
demuxe_original[1][12]=c->put_h264_qpel_pixels_tab[1][12];c->put_h264_qpel_pixels_tab[1][12]=demuxe_1_12;
demuxe_original[1][13]=c->put_h264_qpel_pixels_tab[1][13];c->put_h264_qpel_pixels_tab[1][13]=demuxe_1_13;
demuxe_original[1][14]=c->put_h264_qpel_pixels_tab[1][14];c->put_h264_qpel_pixels_tab[1][14]=demuxe_1_14;
demuxe_original[1][15]=c->put_h264_qpel_pixels_tab[1][15];c->put_h264_qpel_pixels_tab[1][15]=demuxe_1_15;
demuxe_original[2][1]=c->put_h264_qpel_pixels_tab[2][1];c->put_h264_qpel_pixels_tab[2][1]=demuxe_2_1;
demuxe_original[2][2]=c->put_h264_qpel_pixels_tab[2][2];c->put_h264_qpel_pixels_tab[2][2]=demuxe_2_2;
demuxe_original[2][3]=c->put_h264_qpel_pixels_tab[2][3];c->put_h264_qpel_pixels_tab[2][3]=demuxe_2_3;
demuxe_original[2][4]=c->put_h264_qpel_pixels_tab[2][4];c->put_h264_qpel_pixels_tab[2][4]=demuxe_2_4;
demuxe_original[2][5]=c->put_h264_qpel_pixels_tab[2][5];c->put_h264_qpel_pixels_tab[2][5]=demuxe_2_5;
demuxe_original[2][6]=c->put_h264_qpel_pixels_tab[2][6];c->put_h264_qpel_pixels_tab[2][6]=demuxe_2_6;
demuxe_original[2][7]=c->put_h264_qpel_pixels_tab[2][7];c->put_h264_qpel_pixels_tab[2][7]=demuxe_2_7;
demuxe_original[2][8]=c->put_h264_qpel_pixels_tab[2][8];c->put_h264_qpel_pixels_tab[2][8]=demuxe_2_8;
demuxe_original[2][9]=c->put_h264_qpel_pixels_tab[2][9];c->put_h264_qpel_pixels_tab[2][9]=demuxe_2_9;
demuxe_original[2][10]=c->put_h264_qpel_pixels_tab[2][10];c->put_h264_qpel_pixels_tab[2][10]=demuxe_2_10;
demuxe_original[2][11]=c->put_h264_qpel_pixels_tab[2][11];c->put_h264_qpel_pixels_tab[2][11]=demuxe_2_11;
demuxe_original[2][12]=c->put_h264_qpel_pixels_tab[2][12];c->put_h264_qpel_pixels_tab[2][12]=demuxe_2_12;
demuxe_original[2][13]=c->put_h264_qpel_pixels_tab[2][13];c->put_h264_qpel_pixels_tab[2][13]=demuxe_2_13;
demuxe_original[2][14]=c->put_h264_qpel_pixels_tab[2][14];c->put_h264_qpel_pixels_tab[2][14]=demuxe_2_14;
demuxe_original[2][15]=c->put_h264_qpel_pixels_tab[2][15];c->put_h264_qpel_pixels_tab[2][15]=demuxe_2_15;
demuxe_original[3][1]=c->put_h264_qpel_pixels_tab[3][1];c->put_h264_qpel_pixels_tab[3][1]=demuxe_3_1;
demuxe_original[3][2]=c->put_h264_qpel_pixels_tab[3][2];c->put_h264_qpel_pixels_tab[3][2]=demuxe_3_2;
demuxe_original[3][3]=c->put_h264_qpel_pixels_tab[3][3];c->put_h264_qpel_pixels_tab[3][3]=demuxe_3_3;
demuxe_original[3][4]=c->put_h264_qpel_pixels_tab[3][4];c->put_h264_qpel_pixels_tab[3][4]=demuxe_3_4;
demuxe_original[3][5]=c->put_h264_qpel_pixels_tab[3][5];c->put_h264_qpel_pixels_tab[3][5]=demuxe_3_5;
demuxe_original[3][6]=c->put_h264_qpel_pixels_tab[3][6];c->put_h264_qpel_pixels_tab[3][6]=demuxe_3_6;
demuxe_original[3][7]=c->put_h264_qpel_pixels_tab[3][7];c->put_h264_qpel_pixels_tab[3][7]=demuxe_3_7;
demuxe_original[3][8]=c->put_h264_qpel_pixels_tab[3][8];c->put_h264_qpel_pixels_tab[3][8]=demuxe_3_8;
demuxe_original[3][9]=c->put_h264_qpel_pixels_tab[3][9];c->put_h264_qpel_pixels_tab[3][9]=demuxe_3_9;
demuxe_original[3][10]=c->put_h264_qpel_pixels_tab[3][10];c->put_h264_qpel_pixels_tab[3][10]=demuxe_3_10;
demuxe_original[3][11]=c->put_h264_qpel_pixels_tab[3][11];c->put_h264_qpel_pixels_tab[3][11]=demuxe_3_11;
demuxe_original[3][12]=c->put_h264_qpel_pixels_tab[3][12];c->put_h264_qpel_pixels_tab[3][12]=demuxe_3_12;
demuxe_original[3][13]=c->put_h264_qpel_pixels_tab[3][13];c->put_h264_qpel_pixels_tab[3][13]=demuxe_3_13;
demuxe_original[3][14]=c->put_h264_qpel_pixels_tab[3][14];c->put_h264_qpel_pixels_tab[3][14]=demuxe_3_14;
demuxe_original[3][15]=c->put_h264_qpel_pixels_tab[3][15];c->put_h264_qpel_pixels_tab[3][15]=demuxe_3_15;
}
}
