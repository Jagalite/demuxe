#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Rolling HLS discontinuities and DASH periods over immutable repeated fragments."""
import hashlib,importlib.util,re
from pathlib import Path
spec=importlib.util.spec_from_file_location('period_fixture',Path(__file__).resolve().parents[1]/'periods/fixture-server.py')
base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
class FixtureOrigin(base.FixtureOrigin):
    def body(self,name):
        first,edge=self.window()
        group=re.fullmatch(r'(low|medium|high|english|alternate)/media.m3u8',name)
        if group or name=='captions.m3u8':
            lines=['#EXTM3U','#EXT-X-VERSION:7','#EXT-X-TARGETDURATION:3',f'#EXT-X-MEDIA-SEQUENCE:{first}',f'#EXT-X-DISCONTINUITY-SEQUENCE:{first//8}']
            durations=[2.0]*8
            if group:
                durations=[float(line.split(':')[1].rstrip(','))for line in (self.fixtures/name).read_text().splitlines()if line.startswith('#EXTINF:')][:8]
                durations[-1]=16-sum(durations[:-1]);assert durations[-1]>0
            previous=None
            for seq in range(first,edge):
                epoch,index=divmod(seq,8)
                if epoch!=previous:
                    if previous is not None:lines.append('#EXT-X-DISCONTINUITY')
                    if group:lines.append(f'#EXT-X-MAP:URI="../epoch{epoch}/{group[1]}/init.mp4"')
                    previous=epoch
                lines.extend([f'#EXTINF:{durations[index]:.6f},',f'../epoch{epoch}/{group[1]}/{index:03d}.m4s' if group else f'epoch{epoch}/cue-{index}.vtt'])
            data=('\n'.join(lines)+'\n').encode();(self.output/(hashlib.sha256(data).hexdigest()+'.manifest')).write_bytes(data)
            return 200,data,True
        resource=re.fullmatch(r'epoch(\d+)/(?:(low|medium|high|english|alternate)/(init.mp4|(\d+)\.m4s)|cue-(\d+)\.vtt)',name)
        if resource:
            epoch=int(resource[1]);number=int(resource[4] or resource[5]) if resource[4] or resource[5] else None
            if number is not None and not first<=epoch*8+number<edge:return (410 if epoch*8+number<first else 503),b'',False
            if resource[5]:
                text=f'WEBVTT\nX-TIMESTAMP-MAP=LOCAL:00:00:02.000,MPEGTS:0\n\n{epoch}-{number}\n00:00:{number*2+2.25:06.3f} --> 00:00:{number*2+3.75:06.3f}\nEpoch {epoch} cue {number}\n'
                return 200,text.encode(),False
            file=self.fixtures/resource[2]/resource[3]
            return (200,file.read_bytes(),False) if file.is_file() else (404,b'',False)
        return super().body(name)
