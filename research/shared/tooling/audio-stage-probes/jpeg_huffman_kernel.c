/* SPDX-License-Identifier: Apache-2.0 */
#include <stdint.h>
#ifdef SPECIAL
#include "tables.h"
#endif
static unsigned char input[1048576],tablebuf[544];static int16_t output[65536];
static struct table{int minimum[17],maximum[17],index[17];unsigned short fast[256];unsigned char values[256];} tables[2];
static int length,pos,available,error,consumed,longhits,symbols;static uint32_t cache;
unsigned char*get_input(void){return input;}unsigned char*get_tables(void){return tablebuf;}int16_t*get_output(void){return output;}int get_consumed(void){return consumed;}int get_longhits(void){return longhits;}int get_symbols(void){return symbols;}
int setup(void){
#ifdef SPECIAL
for(int i=0;i<544;i++)if(tablebuf[i]!=expected[i])return -2;
#endif
for(int t=0;t<2;t++){struct table*p=&tables[t];for(int i=0;i<256;i++)p->fast[i]=0;int code=0,count=0;for(int len=1;len<=16;len++){int n=tablebuf[t*272+len-1];if(code+n>(1<<len)||count+n>256)return -1;p->minimum[len]=code;p->maximum[len]=n?code+n-1:-1;p->index[len]=count;for(int j=0;j<n;j++){int symbol=tablebuf[t*272+16+count];p->values[count++]=symbol;if(len<=8){int first=(code+j)<<(8-len);for(int k=0;k<(1<<(8-len));k++)p->fast[first+k]=(len<<8)|symbol;}}code=(code+n)<<1;}if(!count)return -1;}return 0;}
static int refill(int need){while(available<need&&pos<length){unsigned b=input[pos++];if(b==255){if(pos>=length||input[pos++]!=0){error=1;return 0;}}cache=(cache<<8)|b;available+=8;}return available>=need;}
static int bits(int n){if(!n)return 0;if(!refill(n)){error=1;return 0;}int v=(cache>>(available-n))&((1u<<n)-1);available-=n;consumed+=n;return v;}
static int symbol(int t){struct table*p=&tables[t];symbols++;if(refill(8)){unsigned i=(cache>>(available-8))&255;
#ifdef SPECIAL
unsigned v=specialfast[t][i];
#else
unsigned v=p->fast[i];
#endif
if(v>>8){bits(v>>8);return v&255;}}longhits++;int code=0;for(int len=1;len<=16&&!error;len++){code=(code<<1)|bits(1);if(p->maximum[len]>=0&&code>=p->minimum[len]&&code<=p->maximum[len])return p->values[p->index[len]+code-p->minimum[len]];}error=1;return 0;}
static int extend(int v,int n){return n&&v<(1<<(n-1))?v-((1<<n)-1):v;}
int decode(int n,int blocks){if(n<0||n>1048576||blocks<1||blocks>1024)return -1;length=n;pos=available=error=consumed=longhits=symbols=0;cache=0;int dc=0;static const unsigned char zig[64]={0,1,8,16,9,2,3,10,17,24,32,25,18,11,4,5,12,19,26,33,40,48,41,34,27,20,13,6,7,14,21,28,35,42,49,56,57,50,43,36,29,22,15,23,30,37,44,51,58,59,52,45,38,31,39,46,53,60,61,54,47,55,62,63};for(int b=0;b<blocks;b++){int16_t*out=output+b*64;for(int i=0;i<64;i++)out[i]=0;int category=symbol(0);if(category>11)return -2;dc+=extend(bits(category),category);out[0]=dc;for(int k=1;k<64&&!error;){int rs=symbol(1),run=rs>>4,size=rs&15;if(!size){if(!run)break;if(run!=15)return -3;k+=16;if(k>64)return -4;continue;}if(size>10)return -5;k+=run;if(k>=64)return -6;out[zig[k++]]=extend(bits(size),size);}if(error)return -7;}return blocks*64;}
