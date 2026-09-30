#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Isolated AC3 -> FLAC24/AAC experiment. Never installs production engines.
FLAC24 quantizes float PCM; AAC is lossy. Neither is a lossless policy.
"""
import pathlib, shutil, subprocess, argparse, json
root=pathlib.Path(__file__).resolve().parents[2]
p=argparse.ArgumentParser();p.add_argument('--output',required=True,type=pathlib.Path);a=p.parse_args()
out=a.output.resolve();out.mkdir(parents=True,exist_ok=False);tree=out/'tree'
for name in ['sources.lock.json','scripts/build-audio-adaptation.py','scripts/stamp-engine-license.py','native/remux/remux.c','native/adaptation/flac.h']:
 target=tree/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(root/name,target)
shutil.copytree(root/'patches/ffmpeg-adaptation',tree/'patches/ffmpeg-adaptation')
def replace(text,old,new):
 assert old in text, old
 return text.replace(old,new)
f=tree/'scripts/build-audio-adaptation.py';s=f.read_text()
s=replace(s,"p.add_argument('--opus'","p.add_argument('--aac',action='store_true');p.add_argument('--opus'")
s=replace(s,'--enable-decoder=pcm_s16le,pcm_s24le,pcm_s32le,flac,dca','--enable-decoder=ac3')
s=replace(s,"'--enable-encoder='+('flac,opus' if a.opus else 'flac')","'--enable-encoder=flac,aac'")
s=replace(s,"args=['emcc','-O2'","args=['emcc','-DDEMUXE_AC3_AAC='+str(int(a.aac)),'-O2'")
s=replace(s,"'scope':'Optional bounded FLAC/Opus audio preparation; no video decoder/encoder configured; release qualification is separate'","'scope':'EXPERIMENT ONLY: AC3 float PCM to AAC 192kbps or quantized FLAC24; copied video; not lossless or production qualified','experimentCodec':'aac' if a.aac else 'flac24'")
f.write_text(s)
f=tree/'native/adaptation/flac.h';s=f.read_text();s=replace(s,'adapt_enabled==2','DEMUXE_AC3_AAC')
s=replace(s,"codec:$9?'opus':'flac'","codec:$9?'aac':'flac',quantizedFloatPCM:!$9,clippedSamples:Module.transcodeClipped||0")
start=s.index('static int adaptation_describe(');end=s.index('static int adaptation_open(',start)
s=s[:start]+'''static int adaptation_describe(AVCodecParameters *p){
 if(p->codec_id!=AV_CODEC_ID_AC3)return reject("Experiment accepts AC3 only");
 if(p->sample_rate!=48000||p->ch_layout.nb_channels!=2)return reject("Experiment accepts 48 kHz stereo only");
 snprintf(audio_codec,sizeof(audio_codec),"%s",DEMUXE_AC3_AAC?"mp4a.40.2":"flac");return 0;
}
'''+s[end:]
s=replace(s,'DEMUXE_AC3_AAC?AV_CODEC_ID_OPUS:AV_CODEC_ID_FLAC','DEMUXE_AC3_AAC?AV_CODEC_ID_AAC:AV_CODEC_ID_FLAC')
s=replace(s,'int bits=p->codec_id==AV_CODEC_ID_PCM_S16LE?16:p->codec_id==AV_CODEC_ID_PCM_S24LE?24:p->bits_per_raw_sample;','int bits=24;')
s=replace(s,'adapt_decoder->request_sample_fmt=bits==16?AV_SAMPLE_FMT_S16:AV_SAMPLE_FMT_S32;','adapt_decoder->request_sample_fmt=AV_SAMPLE_FMT_FLTP;')
s=replace(s,'av_get_packed_sample_fmt(f->format)!=(DEMUXE_AC3_AAC?adapt_decoder->request_sample_fmt:adapt_encoder->sample_fmt)','f->format!=AV_SAMPLE_FMT_FLTP')
start=s.index('  for(int i=0;i<f->nb_samples;i++)');end=s.index('  if(av_audio_fifo_size',start)
s=s[:start]+'''  int clipped=0;
  for(int i=0;i<f->nb_samples;i++)for(int c=0;c<channels;c++){
   float v;memcpy(&v,f->extended_data[c]+i*4,4);
   if(!isfinite(v)){av_frame_free(&converted);return reject("Non-finite decoded PCM");}
   if(DEMUXE_AC3_AAC)memcpy(converted->extended_data[c]+i*4,&v,4);
   else {
    double n=round((double)v*8388608.0);
    if(n>8388607){n=8388607;clipped++;}if(n< -8388608){n=-8388608;clipped++;}
    int32_t sample=(int32_t)((int64_t)n*256);
    memcpy(converted->data[0]+(i*channels+c)*4,&sample,4);
   }
  }
  if(clipped)EM_ASM({Module.transcodeClipped=(Module.transcodeClipped||0)+$0;},clipped);
'''+s[end:]
s='#include <math.h>\n'+s;f.write_text(s)
# AAC priming needs the same explicit edit-list handling as existing Opus.
f=tree/'native/remux/remux.c';s=f.read_text();s=replace(s,'if(adapt_enabled==2&&!mux_webm){','if((adapt_enabled==2||DEMUXE_AC3_AAC)&&!mux_webm){');f.write_text(s)
cmd=['python3',str(tree/'scripts/build-audio-adaptation.py'),'--output',str(out/'build'),'--sdk',str(root/'build/emsdk-4.0.14'),'--archive',str(root/'build/downloads/ffmpeg-adaptation.tar.gz'),'--flac-level','0']
subprocess.run(cmd,check=True);flac=json.loads((out/'build/latest.json').read_text())['engine']
subprocess.run(cmd+['--resume','--aac'],check=True);aac=json.loads((out/'build/latest.json').read_text())['engine']
(out/'engines.json').write_text(json.dumps({'flac24':flac,'aac':aac},indent=2)+'\n')
print(out/'engines.json')
