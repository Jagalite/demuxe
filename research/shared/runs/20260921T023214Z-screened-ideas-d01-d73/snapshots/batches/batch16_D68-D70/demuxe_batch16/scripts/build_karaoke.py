# SPDX-License-Identifier: MIT
from common import *
import re,html

def ts(ms):
 if not isinstance(ms,int) or ms<0:raise ValueError('integer millisecond time required')
 return f'{ms//3600000:02d}:{ms//60000%60:02d}:{ms//1000%60:02d}.{ms%1000:03d}'
def ass_time(ms):return ts(ms)[1:-1]
def parse_time(s):
 m=re.fullmatch(r'(\d+):([0-5]\d):([0-5]\d)\.(\d\d)',s)
 if not m:raise ValueError('ASS centisecond time')
 h,mi,se,cs=map(int,m.groups());return ((h*60+mi)*60+se)*1000+cs*10

def parse_k_line(line):
 if not line.startswith('Dialogue: '):raise ValueError('dialogue required')
 fields=line[len('Dialogue: '):].split(',',9)
 if len(fields)!=10 or fields[0]!='0' or fields[3]!='Default' or fields[4:9]!=['','0','0','0','']:raise ValueError('unsupported line attributes')
 start,end=parse_time(fields[1]),parse_time(fields[2]);s=fields[9];p=0;out=[];at=start
 # This intentionally implements only positive-duration \k tags and literal text.
 for m in re.finditer(r'\{\\k([1-9]\d{0,3})\}([^{}\\\r\n]+)',s):
  if m.start()!=p:raise ValueError('unsupported override/escape')
  dur=int(m[1])*10;out.append({'start':at,'end':at+dur,'text':m[2]});at+=dur;p=m.end()
 if p!=len(s) or not out or at!=end or end<=start:raise ValueError('syllable duration mismatch')
 return {'start':start,'end':end,'syllables':out}

def vtt_for(cues,kind='native',shift=0):
 out='WEBVTT\n\n'
 for ci,c in enumerate(cues):
  if kind=='reference':
   for si,s in enumerate(c['syllables']):
    text=''.join('<c.'+('done' if j<=si else 'wait')+'>'+html.escape(x['text'],quote=False)+'</c>' for j,x in enumerate(c['syllables']))
    out+=f'{ci}-{si}\n{ts(s["start"]+shift)} --> {ts(s["end"]+shift)}\n{text}\n\n'
  else:
   text=''
   for si,s in enumerate(c['syllables']):
    if si:text+='<'+ts(s['start']+(0 if kind=='stale_inner' else shift)+(100 if kind=='wrong_shift' else 0))+'>'
    esc=html.escape(s['text'],quote=False)
    text+=(('<c>'+esc+'</c>') if kind!='unwrapped' else esc)
   out+=f'{ci}\n{ts(c["start"]+shift)} --> {ts(c["end"]+shift)}\n{text}\n\n'
 return out

# Explicit source truth defined independently of parsing and cumulative tag conversion.
TRUTH=[{'start':200,'end':1700,'syllables':[{'start':200,'end':500,'text':'Blue '},{'start':500,'end':900,'text':'skies '},{'start':900,'end':1700,'text':'glow'}]},
 {'start':1850,'end':3650,'syllables':[{'start':1850,'end':2050,'text':'A '},{'start':2050,'end':2550,'text':'& '},{'start':2550,'end':2950,'text':'<B> '},{'start':2950,'end':3650,'text':'waits'}]},
 {'start':3800,'end':5800,'syllables':[{'start':3800,'end':4300,'text':'Stay '},{'start':4300,'end':4800,'text':'then '},{'start':4800,'end':5800,'text':'go'}]}]

def main():
 lines=[r'Dialogue: 0,0:00:00.20,0:00:01.70,Default,,0,0,0,,{\k30}Blue {\k40}skies {\k80}glow',r'Dialogue: 0,0:00:01.85,0:00:03.65,Default,,0,0,0,,{\k20}A {\k50}& {\k40}<B> {\k70}waits',r'Dialogue: 0,0:00:03.80,0:00:05.80,Default,,0,0,0,,{\k50}Stay {\k50}then {\k100}go']
 source='[Script Info]\nScriptType: v4.00+\nPlayResX: 640\nPlayResY: 360\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Default,DejaVu Sans,28,&H0000D6FF,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,2,10,10,10,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n'+'\n'.join(lines)+'\n'
 (F/'syllables.ass').write_text(source);cues=[parse_k_line(l) for l in lines]
 assert cues==TRUTH
 for kind in ['native','reference','unwrapped','wrong_shift']:(F/(kind+'.vtt')).write_text(vtt_for(TRUTH if kind=='reference' else cues,kind))
 for kind in ['native','reference','stale_inner']:(F/('repeat_'+kind+'.vtt')).write_text(vtt_for(TRUTH if kind=='reference' else cues,kind,6000))
 cmd(FF+['-f','lavfi','-i','color=c=0x182433:s=640x360:r=25:d=12','-c:v','libx264','-pix_fmt','yuv420p','-preset','ultrafast','-g','25','-bf','0',F/'backdrop.mp4'])
 guards=[]
 for label,bad in [('continuous sweep',lines[0].replace(r'\k30',r'\kf30')),('uppercase sweep',lines[0].replace(r'\k30',r'\K30')),('zero duration',lines[0].replace(r'\k30',r'\k0')),('movement',lines[0].replace(r'\k30',r'\move(0,0,100,100)\k30')),('duration mismatch',lines[0].replace(r'\k30',r'\k31'))]:
  try:parse_k_line(bad);guards.append({'case':label,'rejected':False})
  except ValueError as e:guards.append({'case':label,'rejected':True,'reason':str(e)})
 times=[.30,.48,.52,.72,.88,.92,1.2,1.8,1.97,2.07,2.4,2.57,2.97,3.3,3.75,3.95,4.32,4.9,5.6,5.95,.65,2.2,4.1]
 save('karaoke_manifest.json',{'sourceParsedMatchesAuthoredTruth':cues==TRUTH,'cues':cues,'sourceSha':sha(source.encode()),'nativeCueCount':3,'referenceCueCount':10,'times':times,'guards':guards,'outputContract':'literal text and step highlight timing rendered by native WebVTT; NOT libass geometry/layout equivalence'})
 print('wrote karaoke fixtures')
if __name__=='__main__':main()
