# SPDX-License-Identifier: MIT
from common import *
from playwright.sync_api import sync_playwright
from PIL import Image
import io

CSS='''body{margin:0;background:black;}video{width:640px;height:360px;display:block;}video::cue{font-family:sans-serif;font-size:28px;color:#ffd600;background-color:rgba(0,0,0,.7);}video::cue(:past){color:#ffd600;}video::cue(:future){color:white;}video::cue(.done){color:#ffd600;}video::cue(.wait){color:white;}'''
JS='''
window.pauseAt=async t=>{const v=window.v;v.pause();if(Math.abs(v.currentTime-t)>1e-7){let p=ev(v,'seeked');v.currentTime=t;await p;}await sleep(70);return{requested:t,time:v.currentTime,active:Array.from(v.textTracks).map(tr=>({mode:tr.mode,cues:Array.from(tr.activeCues||[],c=>({text:c.getCueAsHTML().textContent,start:c.startTime,end:c.endTime}))}))}};
window.setTrack=async name=>{for(let [k,x] of Object.entries(window.tracks))x.track.mode=k===name?'showing':'hidden';await sleep(60)};
window.setup=async()=>{window.v=document.createElement('video');document.body.append(v);v.muted=true;v.controls=false;window.urls=[];window.tracks={};v.src=URL.createObjectURL(new Blob([await load('backdrop.mp4')],{type:'video/mp4'}));urls.push(v.src);if(v.readyState<1)await ev(v,'loadedmetadata');
for(const name of ['native','reference','unwrapped','wrong_shift','repeat_native','repeat_reference','repeat_stale_inner']){let el=document.createElement('track');el.kind='subtitles';el.srclang='en';el.label=name;el.src=URL.createObjectURL(new Blob([await load(name+'.vtt')],{type:'text/vtt'}));urls.push(el.src);let p=ev(el,'load');v.append(el);el.track.mode='hidden';await p;el.track.mode='hidden';tracks[name]=el}return{duration:v.duration,cues:Object.fromEntries(Object.entries(tracks).map(([k,e])=>[k,e.track.cues.length]))}};
window.cleanup=()=>{v.pause();for(let t of Object.values(tracks))t.remove();v.removeAttribute('src');v.load();v.remove();for(let u of urls)URL.revokeObjectURL(u);return{urlsRevoked:urls.length,videoRemoved:!v.isConnected}}
'''

def px(png):return np.asarray(Image.open(io.BytesIO(png)).convert('RGBA'))
def main():
 m=json.loads((E/'karaoke_manifest.json').read_text());o={'checks':[],'repeat':[]}
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required']);pg=b.new_page(viewport={'width':680,'height':400},device_scale_factor=1);pg.set_content('<html><head></head><body></body></html>');pg.add_style_tag(content=CSS);pg.expose_function('readBytes',lambda n:base64.b64encode((F/n).read_bytes()).decode())
  pg.add_script_tag(content=(Path(__file__).parent/'browser_caf.js').read_text());pg.add_script_tag(content=JS);o['setup']=pg.evaluate('()=>setup()');v=pg.locator('video');source=pg.evaluate('()=>v.currentSrc')
  for i,t in enumerate(m['times']):
   pg.evaluate('(t)=>pauseAt(t)',t);r={'requested':t,'variants':{}};images={}
   for mode in ['native','reference','unwrapped','wrong_shift']:
    pg.evaluate('(m)=>setTrack(m)',mode);meta=pg.evaluate('()=>({time:v.currentTime,text:Array.from(v.textTracks).filter(t=>t.mode==="showing").flatMap(t=>Array.from(t.activeCues||[],c=>c.getCueAsHTML().textContent))})');png=v.screenshot();images[mode]=px(png);r['variants'][mode]={'hash':sha(images[mode].tobytes()),**meta}
    if i in [0,2,9,11,13]:(E/f'karaoke_{i}_{mode}.png').write_bytes(png)
   for mode in ['native','unwrapped','wrong_shift']:r[mode]=compare(images[mode],images['reference'])
   o['checks'].append(r);save('browser_karaoke.json',o)
  for t in [6.3,6.6,7.2,8.2,8.8,10.4,11.1,6.7]:
   pg.evaluate('(t)=>pauseAt(t)',t);r={'requested':t};ims={}
   for mode in ['repeat_native','repeat_reference','repeat_stale_inner']:
    pg.evaluate('(m)=>setTrack(m)',mode);ims[mode]=px(v.screenshot())
   r['correct']=compare(ims['repeat_native'],ims['repeat_reference']);r['stale']=compare(ims['repeat_stale_inner'],ims['repeat_reference']);o['repeat'].append(r);save('browser_karaoke.json',o)
  # Natural-speed segment: no candidate cue or style updates while time advances.
  pg.evaluate('()=>setTrack("native")');pg.evaluate('()=>pauseAt(.23)');pg.evaluate('()=>v.play()');pg.wait_for_timeout(1050);pg.evaluate('()=>v.pause()');time_now=pg.evaluate('()=>v.currentTime');pic=px(v.screenshot());pg.evaluate('()=>setTrack("reference")');ref=px(v.screenshot());o['autonomous']={'time':time_now,**compare(pic,ref)}
  # A playback-rate change should still use media time; checking paused output after running at 2x.
  pg.evaluate('()=>setTrack("native")');pg.evaluate('()=>pauseAt(1.91)');pg.evaluate('()=>{v.playbackRate=2;return v.play()}');pg.wait_for_timeout(340);pg.evaluate('()=>v.pause()');pic=px(v.screenshot());tn=pg.evaluate('()=>v.currentTime');pg.evaluate('()=>setTrack("reference")');o['rate2']={'time':tn,**compare(pic,px(v.screenshot()))}
  o['sourceUnchanged']=source==pg.evaluate('()=>v.currentSrc');pg.evaluate('()=>pauseAt(11.7)');pg.evaluate('()=>setTrack("repeat_native")');o['ended']=pg.evaluate('async()=>{let p=ev(v,"ended",2500);await v.play();await p;return true}');o['cleanup']=pg.evaluate('()=>cleanup()');save('browser_karaoke.json',o);b.close()
 print('native exact',sum(x['native']['exact'] for x in o['checks']),len(o['checks']),'repeat',sum(x['correct']['exact'] for x in o['repeat']),len(o['repeat']),'autonomous',o['autonomous'],'rate2',o['rate2'])
if __name__=='__main__':main()
