// SPDX-License-Identifier: MIT
import {Player} from '/web/generated/index.js';
const ass=`[Script Info]
ScriptType: v4.00+
PlayResX: 320
PlayResY: 180
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Demuxe Qualification,40,&H00FFFF00,&H00FFFF00,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.50,0:00:04.00,Default,,0,0,0,,{\\an7\\pos(30,30)}AAA
`;
function glyphs(player){
 const canvas=player.surface,data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data,groups=[];let group;
 for(let x=0;x<canvas.width;x++){let count=0,top=canvas.height,bottom=0;for(let y=0;y<canvas.height;y++){const i=(y*canvas.width+x)*4;if(data[i]<40&&data[i+1]>200&&data[i+2]>200){count++;top=Math.min(top,y);bottom=Math.max(bottom,y);}}
  if(count){if(!group)group={left:x,right:x,top,bottom,pixels:0};group.right=x;group.top=Math.min(group.top,top);group.bottom=Math.max(group.bottom,bottom);group.pixels+=count;}else if(group){groups.push(group);group=undefined;}}
 if(group)groups.push(group);return groups.map(g=>({...g,fill:g.pixels/((g.right-g.left+1)*(g.bottom-g.top+1))}));
}
window.fontCheck=async(runtime='jspi',mode='software')=>{
 const result={key:'custom-font-and-plain-subtitles',runtime,mode,isolated:crossOriginIsolated,passed:false,scope:'Public custom font glyph identity, removal and SRT/VTT styling'};
 const host=document.createElement('div');document.querySelector('main').replaceChildren(host);const player=new Player(host,{remuxRuntime:runtime,mode,width:320,height:180,assetBase:new URL('/',location.href).href});window.player=player;
 try{
  await player.open(new File([await(await fetch('/fixture/font')).blob()],'font.mp4'));
  const sub=await player.attachSubtitle(new File([ass],'glyph.ass'),{select:true});await player.subtitleVisible(true);await player.seek(1);result.fallback=glyphs(player);
  const font=await player.attachFont(new File([await(await fetch('/fixture-asset/font/DemuxeQualification.ttf')).blob()],'custom.ttf'));await player.seek(1);result.custom=glyphs(player);
  if(result.custom.length!==3||result.custom.some(g=>g.fill<.95||g.pixels<150)||result.fallback.every(g=>g.fill>.8))throw Error('Custom font glyph identity mismatch');
  await player.removeAttachment(sub);await player.setSubtitleStyle({fontFamily:'Demuxe Qualification',fontSize:40,color:'#00ffff',borderSize:0});
  for(const [format,text] of [['srt','1\n00:00:00,500 --> 00:00:04,000\nAAA\n'],['vtt','WEBVTT\n\n00:00.500 --> 00:04.000\nAAA\n']]){
   const handle=await player.attachSubtitle(new File([text],'glyph.'+format),{select:true});await player.subtitleVisible(true);await player.seek(1);result[format]=glyphs(player);
   if(result[format].length!==3||result[format].some(g=>g.fill<.95||g.pixels<150))throw Error(format+' style/font mismatch');await player.removeAttachment(handle);
  }
  await player.setSubtitleStyle({});await player.attachSubtitle(new File([ass],'glyph.ass'),{select:true});await player.subtitleVisible(true);await player.removeAttachment(font);await player.seek(1);result.removed=glyphs(player);
  if(result.removed.length!==3||result.removed.every(g=>g.fill>.8))throw Error('Removed font survived replacement');
  const backend=player.current.backend;await player.destroy();result.cleanup=backend.diagnostics.cleanup;if(result.cleanup.scheduler.liveTasks||result.cleanup.scheduler.freeSlots!==24)throw Error('Font case cleanup failed');result.passed=true;
 }catch(error){result.error=String(error.stack??error);result.diagnostics=player.current?.backend?.diagnostics;await player.destroy().catch(e=>result.cleanupError=String(e));}
 await fetch('/result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(result)});return result;
};
