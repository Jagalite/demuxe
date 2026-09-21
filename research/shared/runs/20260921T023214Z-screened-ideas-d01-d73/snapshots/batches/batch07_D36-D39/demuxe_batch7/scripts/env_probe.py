from http.server import ThreadingHTTPServer,BaseHTTPRequestHandler
from threading import Thread
import json,platform,subprocess,pathlib
from playwright.sync_api import sync_playwright
class H(BaseHTTPRequestHandler):
 def do_GET(self):
  b=b'<!doctype html><html><body>Demuxe local component experiments</body></html>'; self.send_response(200);self.send_header('Content-Type','text/html');self.send_header('Content-Length',str(len(b)));self.end_headers();self.wfile.write(b)
 def log_message(self,*args):pass
s=ThreadingHTTPServer(('127.0.0.1',0),H);t=Thread(target=s.serve_forever,daemon=True);t.start()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'],headless=True);pg=b.new_page(); o={}
 for url in ['about:blank',f'http://127.0.0.1:{s.server_port}/']:
  try:
   pg.goto(url,timeout=5000);o[url]=pg.evaluate('({secure:isSecureContext,origin:location.origin,VideoDecoder:typeof VideoDecoder,AudioDecoder:typeof AudioDecoder,VideoFrame:typeof VideoFrame,MediaSource:typeof MediaSource})')
  except Exception as e:o[url]={'error':str(e)}
 o['browser']=b.version;o['ffmpeg']=subprocess.check_output(['ffmpeg','-version'],text=True).splitlines()[0];o['python']=platform.python_version();b.close()
s.shutdown();print(json.dumps(o,indent=2));(pathlib.Path(__file__).resolve().parents[1]/'evidence'/'environment_probe.json').write_text(json.dumps(o,indent=2))
