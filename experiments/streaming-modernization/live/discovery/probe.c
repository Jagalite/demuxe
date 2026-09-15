// SPDX-License-Identifier: GPL-2.0-or-later
#include <libavformat/avformat.h>
#include <stdio.h>
int main(int argc,char **argv){
    if(argc!=2)return 2;
    AVFormatContext *f=NULL;AVDictionary *options=NULL;
    av_dict_set(&options,"demuxe_sparse","1",0);
    av_dict_set(&options,"strict_io","1",0);
    int r=avformat_open_input(&f,argv[1],NULL,&options);
    av_dict_free(&options);
    int video=0,audio=0;
    if(r>=0)for(unsigned i=0;i<f->nb_streams;i++){
        AVCodecParameters *c=f->streams[i]->codecpar;
        video+=c->codec_type==AVMEDIA_TYPE_VIDEO&&c->codec_id==AV_CODEC_ID_H264&&c->width>0&&c->height>0;
        audio+=c->codec_type==AVMEDIA_TYPE_AUDIO&&c->codec_id==AV_CODEC_ID_AAC&&c->sample_rate>0;
    }
    printf("{\"openError\":%d,\"video\":%d,\"audio\":%d}\n",r,video,audio);
    avformat_close_input(&f);
    return r<0||video!=3||audio!=2;
}
