"""Playwright browser execution with in-memory fixture binding. SPDX-License-Identifier: MIT."""
from pathlib import Path
import json,base64,shutil,os,argparse,hashlib
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]; F=R/'fixtures'; E=R/'evidence'
p=argparse.ArgumentParser();p.add_argument('stage',choices=['audio','routes','reference']);p.add_argument('--only',nargs='*');args=p.parse_args()
target=E/f'browser_{args.stage}.json'
out=json.loads(target.read_text()) if args.only and target.exists() else {}
out['source_files']={f.name:hashlib.sha256(f.read_bytes()).hexdigest() for f in sorted(F.iterdir()) if f.is_file()}
with sync_playwright() as p:
    b=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE') or shutil.which('chromium'),headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
    page=b.new_page();page.expose_function('readBytes',lambda n:base64.b64encode((F/n).read_bytes()).decode())
    page.evaluate('()=>window.loadFile=async n=>Uint8Array.from(atob(await readBytes(n)),c=>c.charCodeAt(0))')
    page.evaluate('(m)=>window.manifest=m',json.loads((E/'manifest.json').read_text()))
    for file in ['sha256.js','browser.js']:page.add_script_tag(content=(R/'scripts'/file).read_text())
    out['environment']=page.evaluate('({userAgent:navigator.userAgent,secureContext:isSecureContext,VideoDecoder:typeof VideoDecoder,MediaSource:typeof MediaSource})')
    def save(key,call):
        if args.only and key not in args.only:return
        out[key]=page.evaluate(call);(E/f'browser_{args.stage}.json').write_text(json.dumps(out,indent=2))
        # Verbose per-block data saved to JSON, not stdout.
        print(key,json.dumps({k:v for k,v in out[key].items() if k not in ['blocks','pictures','seeks','events']}),flush=True)
    if args.stage=='audio':
        for c in ['zero','plus','minus']:
            for ext in ['ogg','webm','mp4']:
                name=f'opus_{c}.{ext}';save(name,'decode('+json.dumps(name)+')')
        for lab in ['s16','s24','s32']:
            for mode in ['verbatim','sparse','level0','level5']:
                name=f'{lab}_{mode}.flac';save(name,'decode('+json.dumps(name)+','+json.dumps(lab)+')')
        save('s16_promoted_wastedbits.flac','decode("s16_promoted_wastedbits.flac","s16")')
        save('s16_promoted24.flac','decode("s16_promoted24.flac","s16")')
        for name in ['vorbis.ogg','vorbis.webm']:
            save(name,'decode('+json.dumps(name)+')')
        for name in ['s16_bad_frame_crc.flac','s16_bad_stream_md5.flac','s16_changed_valid_crc.flac']:
            save(name,'decode('+json.dumps(name)+',"s16")')
    elif args.stage=='reference':
        save('direct:video.mp4:0','route("direct:video.mp4",0)')
        save('direct:video_601.mp4:0','route("direct:video_601.mp4",0)')
    elif args.stage=='routes':
        for mode,off in [('late_add',0),('split',0),('split',0.4),('combined_vorbis',0),('direct:av_vorbis.mkv',0),('sparse',0),('switch',0),('switch',-0.3),('split_tagged',0),('switch_tagged',0)]:
            save(f'{mode}:{off}',f'route({json.dumps(mode)},{off})')
    b.close()
