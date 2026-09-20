// SPDX-License-Identifier: Apache-2.0
import {decodePNG} from '../../../../tests/head-to-head/checks.mjs';import fs from 'node:fs';import {execFileSync}from'node:child_process';
const out=process.argv[2],fixture='build/research-r008-native-size-01/assets/fixtures/r008-bt709.mkv';const results=[];
for(const target of[1,6,10]){
 const oracle=`${out}/oracle-${target}.png`;execFileSync('ffmpeg',['-v','error','-ss',String(target),'-i',fixture,'-frames:v','1','-vf','transpose=clock','-y',oracle]);
 const ref=decodePNG(fs.readFileSync(oracle));
 for(const lane of['software','hybrid']){const file=`${out}/${lane}-seek${target}${target===1?'':'-repeat'}.png`;const a=decodePNG(fs.readFileSync(file));let max=0,sum=0,bad=0;for(let i=0;i<a.width*a.height;i++)for(let c=0;c<3;c++){const d=Math.abs(a.pixels[i*a.channels+c]-ref.pixels[i*ref.channels+c]);sum+=d;max=Math.max(max,d);bad+=d>3;}
 results.push({lane,target,width:a.width,height:a.height,mae:sum/(a.width*a.height*3),max,channelsOver3:bad,passed:max<=3});}
}
fs.writeFileSync(out+'/pixel-comparison.json',JSON.stringify(results,null,2)+'\n');console.log(results);
