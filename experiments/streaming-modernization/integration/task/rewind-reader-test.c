// SPDX-License-Identifier: GPL-3.0-or-later
#include "rewind-reader.h"
#include <assert.h>
#include <errno.h>
#include <stdio.h>
#include <libavformat/avio.h>
#include <libavutil/error.h>
struct source {int64_t at;int error;};
static int input(void *opaque,uint8_t *out,int cap){struct source *s=opaque;if(s->error)return s->error;if(cap>511)cap=511;for(int i=0;i<cap;i++)out[i]=(s->at+i)%251;s->at+=cap;return cap;}
int main(){struct source s={0};struct demuxe_rewind_reader r={.opaque=&s,.read=input};uint8_t buf[8192];
 for(int j=0;j<1000;j++){int64_t pos=r.position;int n=demuxe_rewind_read(&r,buf,sizeof(buf));assert(n==511);for(int i=0;i<n;i++)assert(buf[i]==(pos+i)%251);}
 int64_t end=r.produced,start=end-DEMUXE_REWIND_BYTES;assert(demuxe_rewind_seek(&r,start-1,SEEK_SET)<0);assert(r.position==end);assert(demuxe_rewind_seek(&r,end+1,SEEK_SET)<0);assert(demuxe_rewind_seek(&r,0,AVSEEK_SIZE)==AVERROR(ENOSYS));assert(demuxe_rewind_seek(&r,start,SEEK_SET)==start);
 while(r.position<end){int64_t pos=r.position;int n=demuxe_rewind_read(&r,buf,sizeof(buf));assert(n>0);for(int i=0;i<n;i++)assert(buf[i]==(pos+i)%251);assert(s.at==end);}
 int errors[]={AVERROR(EAGAIN),AVERROR(ETIMEDOUT),AVERROR_EXIT,AVERROR(EIO),AVERROR_EOF};for(unsigned i=0;i<sizeof(errors)/sizeof(*errors);i++){s.error=errors[i];assert(demuxe_rewind_read(&r,buf,sizeof(buf))==errors[i]);assert(r.position==end&&r.produced==end);}
 assert(demuxe_rewind_seek(&r,-8,SEEK_CUR)==end-8);assert(demuxe_rewind_read(&r,buf,8)==8);assert(demuxe_rewind_read(&r,buf,8)==AVERROR_EOF);puts("bounded rewind: passed");return 0;}
