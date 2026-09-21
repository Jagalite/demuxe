"""Run reproducible component screens in installed headless Chromium."""
from __future__ import annotations
import argparse,functools,http.server,json,threading,subprocess,base64,hashlib,os,shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];E=ROOT/'evidence'
class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args):pass

def main():
 ap=argparse.ArgumentParser();ap.add_argument('stage',choices=['decode','projection','widths','audio','inflate','pce','islands']);args=ap.parse_args()
 # All fixture bytes are transferred in memory; no page navigation/server is used.
 server=None
 result={}
 try:
  with sync_playwright() as p:
   browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE') or shutil.which('chromium') or shutil.which('google-chrome') or '/usr/bin/chromium',headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
   page=browser.new_page()
   def read_fixture(name):
    path=(ROOT/'fixtures'/name).resolve()
    if path.parent != (ROOT/'fixtures').resolve(): raise ValueError('invalid fixture path')
    return base64.b64encode(path.read_bytes()).decode('ascii')
   page.expose_function('readFixtureB64',read_fixture)
   page.expose_function('localSha256',lambda values: hashlib.sha256(bytes(values)).hexdigest())
   page.evaluate("""() => { window.fetch=async path=>{
    const name=path.split('/').pop();const b64=await window.readFixtureB64(name);
    const str=atob(b64),data=new Uint8Array(str.length);for(let i=0;i<str.length;i++)data[i]=str.charCodeAt(i);
    return new Response(data);
   }}""")
   page.add_script_tag(content=(ROOT/'scripts/sha256.js').read_text())
   assert page.evaluate("sha256Fallback(new TextEncoder().encode('abc'))")==hashlib.sha256(b'abc').hexdigest()
   page.add_script_tag(content=(ROOT/'scripts/browser_tests.js').read_text())
   page.evaluate('init()');result['environment']=page.evaluate('capabilities()')
   result['environment']['transport']='in-memory Python-to-page binding; no HTTP navigation or network measurement'
   (E/f'browser_{args.stage}.json').write_text(json.dumps(result,indent=2))
   def save(key,expr):
    result[key]=page.evaluate(expr);(E/f'browser_{args.stage}.json').write_text(json.dumps(result,indent=2))
    r=result[key];brief={k:v for k,v in r.items() if k not in ['frames','events','captures']} if isinstance(r,dict) else r
    print(key,json.dumps(brief),flush=True)
   if args.stage=='decode':
    for f in ['video.mp4','project_7.mp4','width_2.mp4','width_4.mp4','av_flac.mp4','island_high444.mp4']:
     save(f,f'decodeFrames({json.dumps(f)})')
    save('resume_at_keyframe',"decodeFrames('video.mp4',24)")
    save('resume_at_delta',"decodeFrames('video.mp4',25)")
    save('false_keyframe_control',"decodeFrames('video.mp4',25,true)")
   if args.stage=='projection':
    codec=json.loads((E/'manifest.json').read_text())['files']['video.mp4']['codec'];mime='video/mp4; codecs="'+codec+'"'
    for i in range(8):save(str(i),f'msePlayback("project_{i}.mp4",{json.dumps(mime)})')
    save('video_control',f'msePlayback("video.mp4",{json.dumps(mime)})')
   if args.stage=='widths':
    codec=json.loads((E/'manifest.json').read_text())['files']['video.mp4']['codec'];mime='video/mp4; codecs="'+codec+'"'
    for name in ['width_2.mp4','width_4.mp4','width_mismatch.mp4']:save(name,f'msePlayback({json.dumps(name)},{json.dumps(mime)})')
   if args.stage=='audio':
    save('native_exact_48000','audioExact(48000)');save('wrong_clock_control_44100','audioExact(44100)')
    codec=json.loads((E/'manifest.json').read_text())['files']['video.mp4']['codec'];mime='video/mp4; codecs="'+codec+',flac"'
    save('combined_mse',f'msePlayback("av_flac.mp4",{json.dumps(mime)})')
   if args.stage=='pce':
    codec=json.loads((E/'manifest.json').read_text())['files']['video.mp4']['codec'];mime='video/mp4; codecs="'+codec+',mp4a.40.2"'
    for name in ['av_pce.mp4','av_pce_canonical.mp4']:
     save(name,f'msePlayback({json.dumps(name)},{json.dumps(mime)})')
     save(name+':audio',f'audioFileStats({json.dumps(name)})')
   if args.stage=='islands':
    m=json.loads((E/'manifest.json').read_text());codec=m['files']['video.mp4']['codec'];mime='video/mp4; codecs="'+codec+'"'
    save('prefix',f'msePlayback("island_prefix.mp4",{json.dumps(mime)},[0.5,0.75])')
    save('suffix',f'msePlayback("island_suffix.mp4",{json.dumps(mime)},[2.5,3.5])')
    badmime='video/mp4; codecs="mp4v.61"'
    save('middle_native',f'msePlayback("island_mpeg2.mp4",{json.dumps(badmime)},[0.5,0.75])')
    save('full_reference',f'msePlayback("video.mp4",{json.dumps(mime)},[0.5,0.75,2.5,3.5])')
   if args.stage=='inflate':
    for name in ['packet.zlib','packet_bad_crc.zlib','packet_truncated.zlib','expansion.zlib']:
     for chunk in [7,64,4096]:save(name+':'+str(chunk),f'inflateCase({json.dumps(name)},{chunk})')
   browser.close()
 finally:
  if server is not None:server.shutdown();server.server_close()
if __name__=='__main__':main()
