/*
 * H.264 IDCT
 * Copyright (c) 2004-2011 Michael Niedermayer <michaelni@gmx.at>
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


#include <stdint.h>
#include <string.h>
#include <stdlib.h>
#include <stdio.h>
#include <assert.h>
typedef uint8_t pixel;typedef int16_t dctcoef;typedef unsigned SUINT;
#define FUNCC(x) x
#define av_clip_pixel(x) ((x)<0?0:(x)>255?255:(x))
void FUNCC(ff_h264_idct_add)(uint8_t *_dst, int16_t *_block, int stride)
{
    int i;
    pixel *dst = (pixel*)_dst;
    dctcoef *block = (dctcoef*)_block;
    stride >>= sizeof(pixel)-1;

    block[0] += 1 << 5;

    for(i=0; i<4; i++){
        const SUINT z0=  block[i + 4*0]     +  (unsigned)block[i + 4*2];
        const SUINT z1=  block[i + 4*0]     -  (unsigned)block[i + 4*2];
        const SUINT z2= (block[i + 4*1]>>1) -  (unsigned)block[i + 4*3];
        const SUINT z3=  block[i + 4*1]     + (unsigned)(block[i + 4*3]>>1);

        block[i + 4*0]= z0 + z3;
        block[i + 4*1]= z1 + z2;
        block[i + 4*2]= z1 - z2;
        block[i + 4*3]= z0 - z3;
    }

    for(i=0; i<4; i++){
        const SUINT z0=  block[0 + 4*i]     +  (SUINT)block[2 + 4*i];
        const SUINT z1=  block[0 + 4*i]     -  (SUINT)block[2 + 4*i];
        const SUINT z2= (block[1 + 4*i]>>1) -  (SUINT)block[3 + 4*i];
        const SUINT z3=  block[1 + 4*i]     + (SUINT)(block[3 + 4*i]>>1);

        dst[i + 0*stride]= av_clip_pixel(dst[i + 0*stride] + ((int)(z0 + z3) >> 6));
        dst[i + 1*stride]= av_clip_pixel(dst[i + 1*stride] + ((int)(z1 + z2) >> 6));
        dst[i + 2*stride]= av_clip_pixel(dst[i + 2*stride] + ((int)(z1 - z2) >> 6));
        dst[i + 3*stride]= av_clip_pixel(dst[i + 3*stride] + ((int)(z0 - z3) >> 6));
    }

    memset(block, 0, 16 * sizeof(dctcoef));
}

void FUNCC(candidate)(uint8_t *_dst, int16_t *_block, int stride)
{
    int i;
    pixel *dst = (pixel*)_dst;
    dctcoef *block = (dctcoef*)_block;
    stride >>= sizeof(pixel)-1;

    block[0] += 1 << 5;

    for(i=0; i<4; i++){
        const int16_t z0=  block[i + 4*0]     +  (unsigned)block[i + 4*2];
        const int16_t z1=  block[i + 4*0]     -  (unsigned)block[i + 4*2];
        const int16_t z2= (block[i + 4*1]>>1) -  (unsigned)block[i + 4*3];
        const int16_t z3=  block[i + 4*1]     + (unsigned)(block[i + 4*3]>>1);

        block[i + 4*0]= z0 + z3;
        block[i + 4*1]= z1 + z2;
        block[i + 4*2]= z1 - z2;
        block[i + 4*3]= z0 - z3;
    }

    for(i=0; i<4; i++){
        const int16_t z0=  block[0 + 4*i]     +  (SUINT)block[2 + 4*i];
        const int16_t z1=  block[0 + 4*i]     -  (SUINT)block[2 + 4*i];
        const int16_t z2= (block[1 + 4*i]>>1) -  (SUINT)block[3 + 4*i];
        const int16_t z3=  block[1 + 4*i]     + (SUINT)(block[3 + 4*i]>>1);

        dst[i + 0*stride]= av_clip_pixel(dst[i + 0*stride] + ((int)(int16_t)(z0 + z3) >> 6));
        dst[i + 1*stride]= av_clip_pixel(dst[i + 1*stride] + ((int)(int16_t)(z1 + z2) >> 6));
        dst[i + 2*stride]= av_clip_pixel(dst[i + 2*stride] + ((int)(int16_t)(z1 - z2) >> 6));
        dst[i + 3*stride]= av_clip_pixel(dst[i + 3*stride] + ((int)(int16_t)(z0 - z3) >> 6));
    }

    memset(block, 0, 16 * sizeof(dctcoef));
}

static int guard(const int16_t*b){for(int i=0;i<16;i++)if(b[i]<-2672||b[i]>2672)return 0;return 1;}
static void check(int16_t*b,unsigned seed){uint8_t x[16],y[16];int16_t a[16],c[16];for(int i=0;i<16;i++)x[i]=y[i]=(seed+i*37)&255;memcpy(a,b,32);memcpy(c,b,32);ff_h264_idct_add(x,a,4);candidate(y,c,4);assert(!memcmp(x,y,16));assert(!memcmp(a,c,32));}
int main(void){int16_t b[16];unsigned seed=0x93ac1287;for(unsigned mask=0;mask<65536;mask++){for(int i=0;i<16;i++)b[i]=(mask&(1u<<i))?2672:-2672;assert(guard(b));check(b,mask);}for(int j=0;j<20000;j++){for(int i=0;i<16;i++){seed=seed*1664525u+1013904223u;b[i]=(seed%5345)-2672;}assert(guard(b));check(b,seed);}memset(b,0,sizeof(b));b[0]=2673;assert(!guard(b));b[0]=-2673;assert(!guard(b));b[0]=-32768;assert(!guard(b));puts("85536 exact pinned-baseline/candidate blocks; guard rejects2673,-2673,-32768");}
