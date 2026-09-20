# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,ast,re,json,hashlib,subprocess
fixture=pathlib.Path(sys.argv[1]);mode=sys.argv[2];out=pathlib.Path(sys.argv[3]);result=json.loads((fixture/'results.json').read_text());source=(fixture/'source.h264').read_bytes();assert hashlib.sha256(source).hexdigest()==result['sourceSha256']
def run(c):
 p=subprocess.run(c,capture_output=True);assert p.returncode==0,p.stderr.decode();return p
if mode=='candidate':
 # Fresh per-asset certificate creation is charged. It is not needed on ordinary RAP copy.
 trace=run(['ffmpeg','-v','verbose','-i',str(fixture/'source.h264'),'-c','copy','-bsf:v','trace_headers','-f','null','-']).stderr.decode();fields={}
 for line in trace.splitlines():
  m=re.search(r'\]\s+\d+\s+(\w+(?:\[\d+\])?)\s+[01]+\s+=\s+(-?\d+)',line)
  if m:fields.setdefault(m[1],[]).append(int(m[2]))
 assert fields==result['fields']
 tree=ast.parse((pathlib.Path(__file__).parent/'ipcm.py').read_text());nodes=[n for n in tree.body if isinstance(n,(ast.FunctionDef,ast.ClassDef)) and n.name in ['split','rbsp','escape','Writer','seed','patch']];ns={'re':re,'bitsnum':fields['log2_max_frame_num_minus4'][0]+4};exec(compile(ast.Module(nodes,type_ignores=[]),'pinned-ipcm-functions','exec'),ns)
 pixels=run(['ffmpeg','-v','error','-i',str(fixture/'source.h264'),'-vf','select=eq(n\\,1)','-frames:v','1','-pix_fmt','yuv420p','-f','rawvideo','-']).stdout;assert len(pixels)==23040
 nals=ns['split'](source);headers=[n for n in nals if n[0]&31 in [7,8]];vcl=[n for n in nals if n[0]&31 in [1,5]];seq=headers+[ns['seed'](pixels)]+[ns['patch'](n)[0] for n in vcl[2:]];raw=out.with_suffix('.h264');raw.write_bytes(b''.join(b'\x00\x00\x00\x01'+n for n in seq))
else:
 assert mode=='baseline';raw=fixture/'source.h264'
run(['ffmpeg','-v','error','-r','24','-i',str(raw),'-c','copy','-movflags','+empty_moov+default_base_moof+frag_keyframe',str(out)])
