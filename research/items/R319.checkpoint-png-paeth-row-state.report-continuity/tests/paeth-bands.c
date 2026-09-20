/* SPDX-License-Identifier: Apache-2.0 */
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <string.h>
#define W 512
#define H 512
#define ROW (W*4)
static uint64_t hash(const unsigned char*b,size_t n){uint64_t h=1469598103934665603ULL;for(size_t i=0;i<n;i++)h=(h^b[i])*1099511628211ULL;return h;}
static unsigned char paeth(int a,int b,int c){int p=a+b-c,pa=abs(p-a),pb=abs(p-b),pc=abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;}
static void row(const unsigned char*f,const unsigned char*previous,unsigned char*out){for(int x=0;x<ROW;x++)out[x]=(unsigned char)(f[x]+paeth(x>=4?out[x-4]:0,previous[x],x>=4?previous[x-4]:0));}
int main(int argc,char**argv){if(argc<3)return 2;FILE*f=fopen(argv[2],"rb");if(!f)return 3;size_t n=(ROW+1)*H;unsigned char*filtered=malloc(n),*previous=calloc(1,ROW),*current=malloc(ROW),*cp=calloc(8,ROW);uint64_t checks[8],sourcekey;if(!filtered||!previous||!current||!cp)return 4;if(fread(filtered,1,n,f)!=n||fgetc(f)!=EOF)return 3;fclose(f);for(int y=0;y<H;y++)if(filtered[y*(ROW+1)]!=4)return 3;sourcekey=hash(filtered,n);int candidate=strcmp(argv[1],"baseline")!=0;if(candidate){for(int y=0;y<H;y++){if(y%64==0)memcpy(cp+(y/64)*ROW,previous,ROW);row(filtered+y*(ROW+1)+1,previous,current);unsigned char*t=previous;previous=current;current=t;}for(int i=0;i<8;i++)checks[i]=hash(cp+i*ROW,ROW);if(argc>3&&strcmp(argv[3],"corrupt-checkpoint")==0)cp[ROW*2+7]^=1;if(argc>3&&strcmp(argv[3],"changed-source")==0)filtered[n-1]^=1;for(int i=0;i<8;i++)if(hash(cp+i*ROW,ROW)!=checks[i])return 5;if(hash(filtered,n)!=sourcekey)return 6;}const int starts[]={448,192,384,64,256,128,480,320,32,416};unsigned reconstructed=candidate?H:0;for(int q=0;q<10;q++){int start=starts[q],begin=candidate?(start/64)*64:0;if(candidate)memcpy(previous,cp+(start/64)*ROW,ROW);else memset(previous,0,ROW);for(int y=begin;y<start+16;y++){row(filtered+y*(ROW+1)+1,previous,current);reconstructed++;if(y>=start&&fwrite(current,1,ROW,stdout)!=ROW)return 7;unsigned char*t=previous;previous=current;current=t;}}fprintf(stderr,"{\"reconstructedRowsIncludingCheckpointPreparation\":%u,\"checkpointBytes\":%u,\"workingRowBytes\":%u,\"inputBytes\":%zu}\n",reconstructed,candidate?8*ROW:0,2*ROW,n);free(filtered);free(previous);free(current);free(cp);return 0;}
