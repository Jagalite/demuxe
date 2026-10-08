// SPDX-License-Identifier: Apache-2.0
import {execFileSync} from 'node:child_process';
for(const [label,w,h]of [['1080p',1920,1080],['4k',3840,2160]]){
 const filter=`testsrc2=size=${w}x${h}:rate=24,drawbox=x=0:y=0:w=${w/4}:h=${h/2}:color=red:t=fill:enable='lt(t,8)',drawbox=x=0:y=0:w=${w/4}:h=${h/2}:color=lime:t=fill:enable='between(t,8,15.999)',drawbox=x=0:y=0:w=${w/4}:h=${h/2}:color=blue:t=fill:enable='gte(t,16)'`;
 execFileSync('ffmpeg',['-nostdin','-hide_banner','-loglevel','error','-y','-f','lavfi','-i',filter,'-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-t','24','-c:v','libx264','-preset','ultrafast','-threads','2','-g','192','-pix_fmt','yuv420p','-c:a','aac','-ac','2','-movflags','+faststart',`build/preview-route-alignment/fixtures/${label}.mp4`],{stdio:'inherit'});
 console.log(label+' ready');
}

execFileSync('ffmpeg',['-nostdin','-hide_banner','-loglevel','error','-y','-i','build/preview-route-alignment/fixtures/movie.mp4','-vf','scale=720:576,setsar=16/15','-c:v','libx264','-preset','ultrafast','-threads','2','-g','24','-c:a','copy','-movflags','+faststart','build/preview-route-alignment/fixtures/anamorphic.mp4'],{stdio:'inherit'});
