# SPDX-License-Identifier: MIT
from pathlib import Path
import sys,json,base64
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1];E=R/'evidence';F=R/'fixtures'
stage=sys.argv[1] if len(sys.argv)>1 else 'silence'
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
    page=b.new_page(viewport={'width':500,'height':320});page.expose_function('readBytes',lambda n:base64.b64encode((F/n).read_bytes()).decode())
    for f in ['sha256.js','browser.js']:page.add_script_tag(content=(R/'scripts'/f).read_text())
    for n,file in [('manifest','manifest.json'),('captions','captions_manifest.json'),('fir','fir_manifest.json')]:page.evaluate('(x)=>window[x.n]=x.m',{'n':n,'m':json.loads((E/file).read_text())})
    out={}
    def rec(k,expression):
        out[k]=page.evaluate(expression);(E/('browser_'+stage+'.json')).write_text(json.dumps(out,indent=2));print(k,json.dumps(out[k])[:900],flush=True)
    if stage=='silence':
        rec('decode','silenceDecode()')
        for mode in ['filled','gap']:rec(mode,'silencePlay('+json.dumps(mode)+')')
    elif stage=='silence_followup':
        for mode in ['gap-repeat','gap-no-eos','gap-seek']:rec(mode,'silencePlay('+json.dumps(mode)+')')
    elif stage=='evict':
        for mode in ['baseline','safe','unsafe']:rec(mode,'evict('+json.dumps(mode)+')')
    elif stage=='fir':rec('results','firTest()')
    elif stage=='fir_qualified':rec('results','firTest(true)')
    elif stage=='tail_minimal':
        page.add_script_tag(content=(R/'scripts'/'tail_minimal.js').read_text());rec('results','tailMinimal()')
    elif stage=='fir_followup':
        page.add_script_tag(content=(R/'scripts'/'fir_followup.js').read_text());rec('results','firFollowup()')
    elif stage=='captions':
        times=[.1,.5,1.7,1.99,2.01,2.1,2.31,2.6,3.2,3.55,3.7,4.01,4.5,5.7,1.7,2.31,.5,4.5]
        for mode in ['correct','wrong-unclipped','wrong-unescaped']:
            setup=page.evaluate('captionSetup('+json.dumps(mode)+')');o={'setup':setup,'checks':[]}
            for i,t in enumerate(times):
                q=page.evaluate('(t)=>captionAt(t)',t);o['checks'].append(q)
                if mode=='correct' and i in [1,12,14,16,17]:
                    fn=f'caption_{i}.png';page.locator('#captionVideo').screenshot(path=str(E/fn));q['screenshot']=fn
                    if i==1:
                        page.evaluate('captionOwner.track.mode="hidden"');page.wait_for_timeout(80);page.locator('#captionVideo').screenshot(path=str(E/'caption_hidden.png'));page.evaluate('captionOwner.track.mode="showing"');page.wait_for_timeout(80)
            o['close']=page.evaluate('captionClose()');out[mode]=o;(E/'browser_captions.json').write_text(json.dumps(out,indent=2));print(mode,'checks',len(o['checks']),flush=True)
    b.close()
