// SPDX-License-Identifier: GPL-3.0-or-later
// Native manifest/window characterization, not browser playback qualification.
#include <stdio.h>
#include <stdlib.h>
#include <libavformat/avformat.h>
#include <libavformat/demuxe.h>
#include <libavutil/time.h>
#include <string.h>
#ifdef TEST_RETIREMENT
static int retired,invalid_retirement;
static void retire(void *opaque,const char *url){
    AVFormatContext *f=opaque;retired++;
    for(unsigned i=0;i<f->nb_streams;i++){
        struct AVDemuxeRepresentation d;
        if(av_demuxe_hls_component(f,i,&d)<0)continue;
        for(int n=0;n<d.segments;n++){
            struct AVDemuxeSegment segment;
            if(av_demuxe_hls_segment(f,i,d.first_sequence+n,0,&segment)<0)continue;
            if(!strcmp(url,segment.url)||!strcmp(url,segment.init_url))invalid_retirement++;
        }
    }
}
#endif
int main(int argc,char **argv){
    if(argc!=3)return 2;
    AVFormatContext *f=NULL;AVDictionary *options=NULL;
    av_dict_set(&options,"demuxe_sparse","1",0);av_dict_set(&options,"strict_io","1",0);
    int ret=avformat_open_input(&f,argv[1],NULL,&options);av_dict_free(&options);
    if(ret<0)return 3;
    if(avformat_find_stream_info(f,NULL)<0)return 4;
    int video=-1;
    for(unsigned i=0;i<f->nb_streams;i++)if(f->streams[i]->codecpar->codec_type==AVMEDIA_TYPE_VIDEO&&f->streams[i]->discard!=AVDISCARD_ALL){video=i;break;}
    if(video<0)return 5;
#ifdef TEST_RETIREMENT
    if(av_demuxe_hls_retirement(f,retire,f)<0)return 15;
#endif
    AVPacket *packet=av_packet_alloc();if(!packet)return 6;
    int64_t deadline=av_gettime_relative()+(int64_t)atoi(argv[2])*1000000;
    uint64_t previous=0;int windows=0,checks=0;
    while(av_gettime_relative()<deadline&&(ret=av_read_frame(f,packet))>=0){
        struct AVDemuxeWindow w;
        ret=av_demuxe_hls_window(f,video,&w);
        if(ret<0)break;
        if(w.revision!=previous){
            printf("{\"revision\":%llu,\"known\":%d,\"live\":%d,\"first\":%lld,\"last\":%lld,\"start\":%lld,\"end\":%lld}\n",(unsigned long long)w.revision,w.known,w.live,(long long)w.first_sequence,(long long)w.last_sequence,(long long)w.start_us,(long long)w.end_us);fflush(stdout);
            for(unsigned i=0;i<f->nb_streams;i++){
                struct AVDemuxeRepresentation d;
                if(av_demuxe_hls_representation(f,i,&d)<0)continue;
                if(av_demuxe_hls_refresh(f,i)<0)return 8;
                if(av_demuxe_hls_representation(f,i,&d)<0||!d.live)return 9;
                struct AVDemuxeSegment part;
                if(av_demuxe_hls_segment(f,i,d.first_sequence,0,&part)<0)return 10;
                if(part.sequence!=d.first_sequence||part.duration_us<=0)return 11;
                int64_t start=part.start_us;
                if(av_demuxe_hls_segment(f,i,-1,start+1,&part)<0||part.sequence!=d.first_sequence)return 12;
                if(d.first_sequence && av_demuxe_hls_segment(f,i,d.first_sequence-1,0,&part)!=AVERROR(ERANGE))return 13;
                if(av_demuxe_hls_segment(f,i,d.first_sequence+d.segments,0,&part)!=AVERROR(EAGAIN))return 14;
                checks++;
            }
            previous=w.revision;windows++;
        }
        av_packet_unref(packet);
    }
    av_packet_free(&packet);avformat_close_input(&f);
#ifdef TEST_RETIREMENT
    fprintf(stderr,"retired=%d invalid=%d\n",retired,invalid_retirement);
    if(retired<3||invalid_retirement)return 16;
#endif
    return windows>=3&&checks>=9?0:7;
}
