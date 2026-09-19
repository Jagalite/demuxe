// SPDX-License-Identifier: GPL-3.0-or-later
// Native manifest/window characterization, not browser playback qualification.
#include <stdio.h>
#include <stdlib.h>
#include <libavformat/avformat.h>
#include <libavformat/demuxe.h>
#include <libavutil/time.h>
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
    AVPacket *packet=av_packet_alloc();if(!packet)return 6;
    int64_t deadline=av_gettime_relative()+(int64_t)atoi(argv[2])*1000000;
    uint64_t previous=0;int windows=0;
    while(av_gettime_relative()<deadline&&(ret=av_read_frame(f,packet))>=0){
        struct AVDemuxeWindow w;
        ret=av_demuxe_hls_window(f,video,&w);
        if(ret<0)break;
        if(w.revision!=previous){
            printf("{\"revision\":%llu,\"known\":%d,\"live\":%d,\"first\":%lld,\"last\":%lld,\"start\":%lld,\"end\":%lld}\n",(unsigned long long)w.revision,w.known,w.live,(long long)w.first_sequence,(long long)w.last_sequence,(long long)w.start_us,(long long)w.end_us);fflush(stdout);
            previous=w.revision;windows++;
        }
        av_packet_unref(packet);
    }
    av_packet_free(&packet);avformat_close_input(&f);
    return windows>=3?0:7;
}
