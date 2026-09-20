# SPDX-License-Identifier: Apache-2.0
"""Create a sealed readable report from completed specialist screens."""
import argparse
import hashlib
import json
from pathlib import Path
import os
import shutil

p=argparse.ArgumentParser(description=__doc__)
p.add_argument('run',type=Path)
p.add_argument('output',type=Path)
p.add_argument('--diagnostic',type=Path)
p.add_argument('--supplement',type=Path,action='append',default=[])
p.add_argument('--diagnostic-supplement',type=Path,action='append',default=[])
a=p.parse_args()
root=Path(__file__).resolve().parents[2]
out=a.output.resolve();out.mkdir();(out/'records').mkdir()
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
inputs={}
def read(run):
    run=run.resolve()
    manifest=json.loads((run/'manifest.json').read_text())
    for name,digest in manifest['sha256'].items():assert sha(run/name)==digest,name
    inputs[str(run.relative_to(root))]=sha(run/'manifest.json')
    return json.loads((run/'summary.json').read_text()),json.loads((run/'fixtures.json').read_text())
summary,fixtures=read(a.run)
def merge(data, supplements):
    cases={c['id']:c for c in data['cases']}
    for path in supplements:
        extra,_=read(path)
        assert extra['assetsSHA256']==data['assetsSHA256']
        assert all(c['id'] in cases for c in extra['cases'])
        cases.update({c['id']:c for c in extra['cases']})
    data['cases']=list(cases.values())
merge(summary,a.supplement)
labels={'hevc-truehd':'HEVC + TrueHD 7.1 / MKV','hevc-dtshd':'HEVC + DTS-HD MA 7.1 / MKV','hevc-atmos':'HEVC + E-AC-3 with Atmos metadata / MP4','dv5':'Dolby Vision profile 5 HEVC + E-AC-3 / MP4','dv81':'Dolby Vision profile 8.1 HEVC + E-AC-3 / MKV'}
labels.update({k:f['label'] for k,f in fixtures.items() if f.get('label')})
rows=['<!-- SPDX-License-Identifier: CC-BY-4.0 -->','','# Specialist and library playback screening','',
      'Chrome '+summary['browser']+' / macOS, headed, fresh browser per case. This is a local-file functional screen, not a CPU campaign or HDR/spatial-audio qualification. Default player policies are used in the comparison; forced modes, if recorded below, are separate diagnostics.','',
      'The earlier eight-second pilot (`specialist-screen-01`) is retained but is not the README source: short clips could reach EOF during route negotiation. This run uses 36-second fixtures and a 60-second open budget.','',
      'Pass* requires visible changing video, audible stereo energy, pause/resume, 1.25× rate progression, forward/back seeks, EOF and cleanup. Marked synthetic Main10 cases additionally check timeline colors and stereo tones. Subtitle cases require the magenta ASS/PGS drawing initially and after seeks; PGS fixtures have independent host-rendered oracles. A failed lifecycle check is not proof that a codec cannot decode.','',
      'All numeric CPU cells elsewhere retain their original campaign evidence. No CPU values were collected here. No pass certifies discrete 7.1, lossless output, DTS-HD extension fidelity, Atmos object rendering, Dolby Vision RPU application, accurate tone mapping or physical HDR output.','',
      'DTS results use the targeted rescreen at audible source positions 12 and 4 seconds. The earlier targets at 10 and 1 seconds fell in genuine source silence; those audio-after-seek failures were harness false negatives and are superseded. The corrected runner independently decodes host stereo energy at every selected seek target before browser testing.','',
      '## Default outcomes','',
      '| Media | Native video | Demuxe auto | Movi | AVPlayer |','| --- | --- | --- | --- | --- |']
for key in fixtures:
    cells=[]
    for player in ['video','demuxe','movi','libmedia']:
        c=next(c for c in summary['cases'] if c['fixture']==key and c['player']==player)
        cells.append('Pass*' if c['status']=='passed' else 'Fail')
    rows.append('| '+labels[key]+' | '+' | '.join(cells)+' |')
rows+=['','## Fixture scope and provenance','',
       '- TrueHD 7.1 repeats a genuine ~0.107-second FFmpeg FATE Atmos/TrueHD regression sample. It exercises the decoder but is not long-form movie-audio coverage.',
       '- DTS-HD MA 7.1 repeats a clean eight-second portion of the FFmpeg sample; its truncated tail is excluded. Base/core-only output is not ruled out by stereo energy checks.',
       '- E-AC-3/JOC audio is copied from Dolby’s Shattered demonstration. No encoder-created E-AC-3 is mislabeled Atmos.',
       '- DV5/8.1 video is copied from Dolby’s Sol Levante sources. Initial parameter sets and actual RPU payloads are retained; DV5 MP4 keeps `hev1`. Basic picture decoding does not establish correct DV5 colors.',
       '- Main10 AAC/FLAC/Opus and ASS cases use generated stereo tones and marked 10-bit 4:2:0 pictures. HDR10+PGS cases use authored 320×180 PQ/BT.2020-tagged synthetic video with mastering/content-light metadata; they are format-composition checks, not UHD-resolution/performance evidence and the same specialist audio excerpts.',
       '- The two DV+Atmos+ASS additions use MKV, copied JOC audio and embedded ASS. They do not qualify Dolby Vision HLS, encrypted streaming or studio-authored A/V synchronization.',
       '- Source URLs, hashes, full probes and exact preparation commands are retained in the input run. Media stays local under `build/`. External media and derived screenshots retain their rights; see [media notices]('+os.path.relpath(root/'docs/MEDIA-NOTICES.md',out)+').','',
       '## Per-case evidence','',
       '| Case | Outcome | Observed route | Completed checks | Failure |','| --- | --- | --- | --- | --- |']
def cases(data,prefix=''):
    for c in data['cases']:
        name=prefix+c['id']+'.json';(out/'records'/name).write_text(json.dumps(c,indent=2)+'\n')
        state=c.get('initial') or c.get('failureState') or {}
        reason=c.get('reason','').split('\n')[0].replace('|','/')
        rows.append('| ['+c['id']+'](records/'+name+') | '+c['status']+' | '+str(state.get('route','—'))+' | '+', '.join(c['checks'])+' | '+reason+' |')
cases(summary)
if a.diagnostic:
    diagnostic,_=read(a.diagnostic)
    merge(diagnostic,a.diagnostic_supplement)
    rows+=['','## Forced Software diagnostics','',
           'These results do not replace automatic selection in the comparison. They answer whether an explicit software request changes the observed failure.','',
           '| Case | Outcome | Observed route | Completed checks | Failure |','| --- | --- | --- | --- | --- |']
    cases(diagnostic,'software-')
rows+=['','## Next work','',
       'Use the first failing check and captured selection trace to target runtime work. Prioritize failures on the common Main10 audio/subtitle combinations, selected-track audio verification and seek recovery, then in-band HEVC parameter-set admission for Dolby Vision. Add independent color/channel/object oracles and longer unrepeated source clips before fidelity or release qualification. Benchmark only after matching correctness passes; retain diagnostic routes separately.']
(out/'REPORT.md').write_text('\n'.join(rows)+'\n')
(out/'inputs.json').write_text(json.dumps(inputs,indent=2)+'\n')
shutil.copyfile(__file__,out/'report-specialist-screen.py')
(out/'manifest.json').write_text(json.dumps({'sha256':{str(f.relative_to(out)):sha(f) for f in out.rglob('*') if f.is_file()}},indent=2)+'\n')
print(out)
