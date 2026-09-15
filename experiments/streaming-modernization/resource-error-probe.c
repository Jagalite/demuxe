#include <stdio.h>
#include <stdlib.h>
#include <libavformat/avformat.h>
int main(int argc,char **argv){
    if(argc!=3)return 2;
    AVFormatContext *s=NULL;AVDictionary *options=NULL;
    av_dict_set(&options,"strict_io",argv[2],0);
    av_dict_set(&options,"extension_picky","0",0);
    av_dict_set(&options,"allowed_extensions","ALL",0);
    av_dict_set(&options,"probesize","32768",0);
    av_dict_set(&options,"analyzeduration","500000",0);
    int ret=avformat_open_input(&s,argv[1],NULL,&options);av_dict_free(&options);
    if(ret<0){printf("{\"stage\":\"open\",\"result\":%d,\"eof\":%s}\n",ret,ret==AVERROR_EOF?"true":"false");return 0;}
    AVPacket *packet=av_packet_alloc();int count=0;double last=0;
    while(count<10000 && (ret=av_read_frame(s,packet))>=0){
        if(packet->pts!=AV_NOPTS_VALUE)last=packet->pts*av_q2d(s->streams[packet->stream_index]->time_base);
        count++;av_packet_unref(packet);
    }
    int seek=-1,recovered=0;double recovered_pts=0;
    if(atoi(argv[2]) && ret<0 && ret!=AVERROR_EOF){
        seek=av_seek_frame(s,-1,2*AV_TIME_BASE,AVSEEK_FLAG_BACKWARD);
        if(seek>=0)for(int i=0;i<400 && av_read_frame(s,packet)>=0;i++){
            if(packet->pts!=AV_NOPTS_VALUE)recovered_pts=packet->pts*av_q2d(s->streams[packet->stream_index]->time_base);
            recovered++;av_packet_unref(packet);if(recovered_pts>8)break;
        }
    }
    printf("{\"stage\":\"read\",\"result\":%d,\"eof\":%s,\"packets\":%d,\"lastPTS\":%.9f,\"seekResult\":%d,\"recoveredPackets\":%d,\"recoveredPTS\":%.9f}\n",ret,ret==AVERROR_EOF?"true":"false",count,last,seek,recovered,recovered_pts);
    av_packet_free(&packet);avformat_close_input(&s);return 0;
}
