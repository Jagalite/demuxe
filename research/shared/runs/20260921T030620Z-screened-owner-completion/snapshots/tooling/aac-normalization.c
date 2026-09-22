// SPDX-License-Identifier: Apache-2.0
// Research-only AAC-LC configuration equivalence. No AAC packets are rewritten.
#include <stddef.h>
#include <stdint.h>
typedef struct { const uint8_t *p; size_t bits, at; int bad; } AscBits;
static unsigned asc_read(AscBits *b,unsigned n){
 if(n>24||b->at+n>b->bits){b->bad=1;return 0;}
 unsigned v=0;while(n--) {v=(v<<1)|((b->p[b->at/8]>>(7-b->at%8))&1);b->at++;}return v;
}
int demuxe_research_normalize_aac(const uint8_t *src,size_t size,uint8_t out[5],int *rate){
 static const int rates[]={96000,88200,64000,48000,44100,32000,24000,22050,16000,12000,11025,8000,7350};
 if(!src||!out||!rate||size<2||size>256)return 0;
 AscBits b={src,size*8,0,0};if(asc_read(&b,5)!=2)return 0;
 unsigned frequency=asc_read(&b,4),explicit_rate=frequency==15;
 if(explicit_rate){unsigned value=asc_read(&b,24);frequency=13;for(unsigned i=0;i<13;i++)if(value==(unsigned)rates[i])frequency=i;}
 if(frequency>=13)return 0;
 unsigned channels=asc_read(&b,4);if(channels!=0&&channels!=2)return 0;
 if(!explicit_rate&&channels==2)return 0; // Existing ordinary configuration stays untouched.
 if(asc_read(&b,3)!=0)return 0; // 1024 samples, no core dependency, no GA extension.
 if(channels==0){
  if(explicit_rate)return 0; // Combined transformation needs its own declared profile.
  if(asc_read(&b,4)!=0||asc_read(&b,2)!=1||asc_read(&b,4)!=frequency)return 0;
  if(asc_read(&b,4)!=1||asc_read(&b,4)!=0||asc_read(&b,4)!=0||asc_read(&b,2)!=0||asc_read(&b,3)!=0||asc_read(&b,4)!=0)return 0;
  if(asc_read(&b,3)!=0||asc_read(&b,1)!=1||asc_read(&b,4)!=0)return 0;
  while(b.at%8)if(asc_read(&b,1)!=0)return 0;
  unsigned comment=asc_read(&b,8);while(comment--)asc_read(&b,8);
 }
 if(b.bad)return 0;
 // Only absent-SBR sync extension or zero padding is eligible. Unknown trailing
 // configuration, present SBR/PS, and malformed lengths never get rewritten.
 size_t remaining=b.bits-b.at;int absent_sbr=0;
 if(remaining==24){AscBits t=b;if(asc_read(&t,24)==0x56e500){absent_sbr=1;b=t;}}
 if(!absent_sbr){while(b.at<b.bits)if(asc_read(&b,1))return 0;}
 if(b.bad)return 0;
 out[0]=(2<<3)|(frequency>>1);out[1]=((frequency&1)<<7)|(2<<3);
 if(absent_sbr){out[2]=0x56;out[3]=0xe5;out[4]=0;}
 *rate=rates[frequency];return absent_sbr?5:2;
}
