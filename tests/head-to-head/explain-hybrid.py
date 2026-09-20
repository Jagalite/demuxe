#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Generate a component-level Hybrid audit from retained runtime evidence."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
AUDIO = {'h264-ac3','h264-eac3','h264-dts','hevc10-ac3','hevc10-eac3','hevc10-dts','hdr10-hevc'}
EMBEDDED = {'h264-srt','h264-movtext','h264-ass','hevc-pgs','h264-vobsub'}
EXTERNAL = {'pcm-ass','h264-vtt'}
MANIFEST = {'dash-h264','dash-av1','hls-live'}
KNOWN = AUDIO | EMBEDDED | EXTERNAL | MANIFEST

def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run',type=Path,action='append',required=True)
    parser.add_argument('--probes',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    latest={}
    for run in args.run:
        run=run.resolve()
        subprocess.run(['node',str(ROOT/'tests/head-to-head/verify.mjs'),str(run)],check=True)
        summary=json.loads((run/'summary.json').read_text())
        assert summary['kind']=='correctness'
        fixtures=json.loads((run/'files/harness/matrix.json').read_text())['fixtures']
        for c in summary['cases']:
            if c['player']=='demuxe' and c['lane']=='auto':latest[c['id']]=(run,c,fixtures[c['fixture']],summary)
    probes_dir=args.probes.resolve()
    for name,digest in json.loads((probes_dir/'manifest.json').read_text())['sha256'].items():assert sha(probes_dir/name)==digest
    probe_summary=json.loads((probes_dir/'result.json').read_text())
    probes={c['id']:c['probes'] for c in probe_summary['cases']}
    rows=[]
    for run,c,f,summary in latest.values():
        state=c.get('initial') or c.get('failureState') or {}
        if state.get('route')!='hybrid':continue
        assert summary['browserIdentity']==f'chromium/{probe_summary["browser"]}/chrome/headless'
        key=c['fixture'];assert key in KNOWN,key
        d=state['diagnostics'];backend=d['backend'];decoder=backend['decoderStats']
        assert backend['decoder']=='webcodecs' and decoder['receivedFrames']>0
        label=f.get('label') or 'H.264 + PCM24 / MKV + ASS'
        outcome='Screen only' if c.get('screenPassed') else c['status'].title()
        parts={'video':'Browser WebCodecs: '+decoder['codec'],'audio':'mpv/FFmpeg → PCM → AudioWorklet','subtitles':'None requested','container':'mpv/FFmpeg demux; video packets passed to WebCodecs'}
        notes=[]
        if key in AUDIO:
            failures=state.get('nativeVerificationFailures',[])
            assert failures and any(x['diagnostics']['capability'].get('videoPresented') and x['diagnostics']['capability'].get('audioProgress') is False for x in failures),key
            direct='Native presented video; selected-audio output verification failed.'
            hint=probes[c['id']]
            assert hint['video']['mse'] is True
            if 'dts' in key:
                component='DTS audio / Demuxe packaging'
                remux='DTS has no Demuxe packet-copy audio construction contract; Native remux was not attempted.'
                notes.append('DTS browser/MSE support was not established; a Demuxe packaging exclusion is not a browser codec verdict.')
            else:
                assert hint['audio']['mse'] is False and hint['combined']['mse'] is False
                component='AC-3 audio' if 'eac3' not in key and key!='hdr10-hevc' else 'E-AC-3 audio'
                remux='MSE rejected the combined MP4 packaging. Separate hints: video accepted, audio rejected.'
            notes.append('The final controlled-remux message belongs to playback recovery; the test did not request custom headers or forced remux. The captured first Native failure identifies audio output.')
            if key=='hdr10-hevc':notes.append('HDR tagging is not the observed routing blocker. Reference HDR transfer, tone mapping and display fidelity remain unqualified.')
        elif key in EMBEDDED:
            component='Embedded '+{'h264-srt':'SRT','h264-movtext':'mov_text','h264-ass':'ASS','hevc-pgs':'PGS','h264-vobsub':'VobSub'}[key]+' subtitles'
            direct='Skipped: embedded subtitle delivery requires mpv rendering under the current selection policy.'
            remux='Skipped by the same subtitle gate; packet-copy preparation does not provide the required subtitle presentation.'
            parts['subtitles']='mpv bitmap decoding/compositing' if key in {'hevc-pgs','h264-vobsub'} else 'mpv/libass text rendering'
            notes.append('This is a subtitle integration/selection boundary, not proof that the video or audio codec is browser-incompatible.')
            if key in {'hevc-pgs','h264-vobsub'}:notes.append('AC-3 audio may independently limit Native, but this fixture hit the subtitle gate before an isolated audio trial.')
            if key=='hevc-pgs' and c['status']=='failed':notes.append('Hybrid still failed the required bitmap marker; routing to the subtitle-capable backend did not establish correct PGS output.')
        elif key in EXTERNAL:
            component='External '+('ASS' if key=='pcm-ass' else 'WebVTT')+' subtitle API'
            direct='Default addSubtitle(File) selected the mpv subtitle path; native subtitle plans were not admitted.'
            remux='Remux does not remove the subtitle API requirement.'
            parts['subtitles']='mpv/libass text rendering'
            if key=='pcm-ass':notes.append('Native ASS is opt-in and was not enabled. The original Native + host ASS result uses a separate explicit overlay; it is not built-in Native ASS qualification.')
            else:notes.append('The harness uses addSubtitle(File), not the separate addTextTrack browser API. Plain Native WebVTT passed. A Demuxe addTextTrack comparison remains to be run; do not label WebVTT inherently non-native.')
        else:
            component='Live timeline policy' if key=='hls-live' else 'DASH manifest integration'
            direct='Skipped: '+('live manifest timelines' if key=='hls-live' else 'manifest track requirements')+' require mpv inspection under current routing.'
            remux='Skipped: Native file preparation is not qualified for manifest sources.'
            notes.append('This is a manifest/timeline routing boundary; WebCodecs decoded the video. It does not establish an audio/video codec rejection by Native.')
            if key=='hls-live':notes.append('The bounded sliding-window screen passed. Native live-HLS equivalence and long-running recovery are not qualified.')
            if key=='dash-h264' and c['status']=='failed':notes.append('Hybrid failed a command timeout; the failure cause is not resolved by the routing explanation.')
        if c.get('reason'):notes.append(c['reason'].split('\n')[0])
        record=run/c['recordPath']
        rows.append({'id':c['id'],'fixture':key,'label':label,'outcome':outcome,'component':component,'nativeDirect':direct,'nativeRemux':remux,'parts':parts,'scope':notes,'record':str(record.relative_to(ROOT)),'recordSHA256':sha(record),'browserIdentity':summary['browserIdentity'],'assetsSHA256':summary['assetsSHA256'],'nativeVerificationFailures':state.get('nativeVerificationFailures',[]),'selectionTrace':state.get('selectionTrace',[]),'planAdmission':d['planAdmission'],'runtimeCapabilities':d['runtimeCapabilities'],'videoEvidence':{'decoder':backend['decoder'],'codec':decoder['codec'],'receivedFrames':decoder['receivedFrames'],'supportCheck':decoder.get('supportCheck')},'mediaTracks':state.get('mediaTracks'),'audioParams':state.get('audioParams'),'mseHints':probes.get(c['id'])})
    assert len(rows)==17 and {r['fixture'] for r in rows}==KNOWN
    out=args.output.resolve();out.mkdir(exist_ok=False)
    (out/'files').mkdir();(out/'files/explain-hybrid.py').write_bytes(Path(__file__).read_bytes())
    (out/'analysis.json').write_text(json.dumps({'kind':'component-routing-audit','command':sys.argv,'sourceRuns':[str(p.resolve().relative_to(ROOT)) for p in args.run],'capabilityProbes':str(probes_dir.relative_to(ROOT)),'cases':rows},indent=2)+'\n')
    lines=['<!-- SPDX-License-Identifier: CC-BY-4.0 -->','','# Why Demuxe selected Hybrid','',
        'All **17 current Hybrid rows** are qualified below: seven audio-related, seven subtitle-related, and three manifest/timeline-related. Reasons describe the tested browser and exact source snapshots; they are not universal format-support claims.',
        '', '## What Hybrid owns', '',
        '| Component | Native | Hybrid in these records |','| --- | --- | --- |',
        '| Video decode | Browser media element | Browser WebCodecs; decoded frames observed in all 17 rows |',
        '| Demux / stream handling | Browser, or packet-copy preparation for Native remux | mpv/FFmpeg |',
        '| Audio | Browser decode/output | mpv/FFmpeg decode and PCM output through AudioWorklet |',
        '| Subtitles | Browser text tracks or an explicitly enabled overlay | mpv/libass for text; mpv bitmap handling for PGS/VobSub |',
        '', 'A subtitle-only blocker still sends **all audio** through mpv in the current Hybrid architecture. WebCodecs does not prove hardware acceleration; the recorded request uses `no-preference`.',
        '', '## Each Hybrid combination', '',
        '| Media | Result | Component preventing Native | Native direct / remux explanation | Evidence |','| --- | --- | --- | --- | --- |']
    for r in rows:
        lines.append(f'| {r["label"]} | {r["outcome"]} | {r["component"]} | {r["nativeDirect"]} {r["nativeRemux"]} | [record](../{r["record"]}) |')
    lines += ['', '## What the evidence does and does not establish', '',
        '- **AC-3 / E-AC-3:** the captured Native failure has presented video but no verified audio output. Separate MSE hints accept the video configuration and reject the audio and combined packaging. This isolates the observed failure to the audio path on this browser, not H.264/HEVC support.',
        '- **DTS:** Native audio verification failed; Demuxe also lacks a DTS packet-copy construction contract. No hypothetical DTS MSE packaging was treated as tested.',
        '- **Subtitle rows:** Native was excluded by a rendering/API requirement. Those gates do not establish codec incompatibility. External WebVTT is a concrete integration candidate: the file API selects mpv, while a separate browser-text-track API exists.',
        '- **DASH and live HLS:** Native was excluded by current manifest/timeline policy. The HLS VOD routing fix is already reflected in the main table; those three VOD cases are Native and are intentionally absent here.',
        '- **Recovery diagnostics:** the final audio rows say direct playback requires controlled remux. The fresh trace shows this is a recovery stage after Native audio failed, not a custom transport request from the harness.',
        '- **Remaining correctness limits:** failures remain failures in the table; the reason is retained in each record. Three surround screens do not qualify discrete channels, and the HDR screen does not qualify display fidelity.',
        '', 'The relevant implementation is [Native semantic selection](../src/internal/selection.ts), [plan admission](../src/internal/playback-plans.ts), and [subtitle-file / browser-track APIs](../src/unified-player.ts).',
        '', '## Per-row scope and follow-up', '']
    for r in rows:
        lines += ['### '+r['label'],'',f'Video: {r["parts"]["video"]}. Audio: {r["parts"]["audio"]}. Subtitles: {r["parts"]["subtitles"]}.','']
        lines += ['- '+note for note in r['scope']]
        lines += ['']
    rel='../'+str(out.relative_to(ROOT))
    lines += ['## Reproduce and inspect','',f'[Structured component audit]({rel}/analysis.json) · [Generator]({rel}/files/explain-hybrid.py) · [MSE hint probes](../{probes_dir.relative_to(ROOT)}/result.json)',
        '', 'The correctness adapter retains selection events and observes/rethrows Native output-verification failures without changing route choice. These are intrusive correctness observations, not performance measurements. Each linked run retains its frozen harness and asset identities.',
        '', 'Run `tests/head-to-head/explain-hybrid.py` with ordered `--run` arguments (latest matching case wins), `--probes` and a fresh `--output`. The generator verifies every run and fails if a Hybrid row lacks an explanation or the audio failure evidence.']
    doc=ROOT/'docs/HEAD-TO-HEAD-HYBRID.md';doc.write_text('\n'.join(lines)+'\n')
    (out/'README.md').write_text('<!-- SPDX-License-Identifier: CC-BY-4.0 -->\n\n# Hybrid component qualification\n\nSee [the per-combination explanation](../../../docs/HEAD-TO-HEAD-HYBRID.md) and\n[structured evidence](analysis.json). This derives routing causes from the exact\nlinked runtime records; it does not change their playback outcomes.\n')
    (out/'manifest.json').write_text(json.dumps({'sha256':{str(p.relative_to(out)):sha(p) for p in sorted(out.rglob('*')) if p.is_file()}},indent=2)+'\n')
    print(f'Qualified {len(rows)} Hybrid rows: {doc}')

if __name__=='__main__':main()
