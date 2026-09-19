# SPDX-License-Identifier: Apache-2.0
import pathlib,subprocess,socket,time,json,os
root=pathlib.Path(__file__).resolve().parents[1];out=[]
for name in ['C21','C22']:
 f=next(x for x in json.loads((root/'fixtures/manifest.json').read_text()) if x['id']==name);sock=root/'tmp'/('mpv-'+name+'.sock');log=(root/'results'/('mpv-'+name+'.log')).open('w')
 p=subprocess.Popen(['/opt/homebrew/bin/mpv','--no-config','--vo=null','--ao=null','--pause=yes','--keep-open=yes','--idle=yes','--input-ipc-server='+sock.name,str(root/'fixtures'/f['file'])],stdout=log,stderr=log,cwd=root/'tmp')
 try:
  for _ in range(100):
   if sock.exists():break
   time.sleep(.05)
  c=socket.socket(socket.AF_UNIX);c.settimeout(3);os.chdir(root/'tmp');c.connect(sock.name);stream=c.makefile('r');serial=0
  def command(args):
   global serial
   serial+=1;c.sendall((json.dumps({'command':args,'request_id':serial})+'\n').encode())
   while True:
    r=json.loads(stream.readline())
    if r.get('request_id')==serial:return r
  time.sleep(.5)
  r={'fixture':name,'version':subprocess.check_output(['/opt/homebrew/bin/mpv','--version'],text=True).splitlines()[0],'states':[]}
  for target in [None,5,11,30,59.7]:
   if target is not None:command(['seek',target,'absolute+exact']);time.sleep(.6)
   r['states'].append({'requested':target,**{k:command(['get_property',k]) for k in ['duration','time-pos','eof-reached','seekable','pause','track-list']}})
  out.append(r)
 finally:
  p.terminate()
  try:p.wait(timeout=3)
  except subprocess.TimeoutExpired:p.kill();p.wait()
  log.close()
(root/'results/mpv-tail-reference.json').write_text(json.dumps(out,indent=2))
