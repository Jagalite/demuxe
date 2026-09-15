#!/usr/bin/env python3
"""Rolling DASH period additions/removals with repeated encoded timestamp epochs."""
import copy,hashlib,importlib.util,re,time
from pathlib import Path
import xml.etree.ElementTree as ET
spec=importlib.util.spec_from_file_location('rolling_fixture',Path(__file__).resolve().parents[1]/'fixture-server.py')
base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
NS=base.NS
class FixtureOrigin(base.FixtureOrigin):
    def window(self):
        edge=int((time.time()+self.offset-self.started)//2)
        return max(0,edge-self.window_seconds//2),edge
    def body(self,name):
        first,edge=self.window()
        if name=='dash/manifest.mpd':
            root=ET.fromstring((self.fixtures/name).read_bytes());original=root.find(NS+'Period');root.remove(original)
            root.attrib.pop('mediaPresentationDuration',None)
            root.attrib.update(type='dynamic',availabilityStartTime=base.utc(self.started),publishTime=base.utc(time.time()+self.offset),minimumUpdatePeriod='PT1S',timeShiftBufferDepth=f'PT{self.window_seconds}S',suggestedPresentationDelay='PT6S')
            for epoch in range(first//8,(edge-1)//8+1):
                period=copy.deepcopy(original);period.set('id',f'epoch-{epoch}');period.set('start',f'PT{epoch*16}S');period.set('duration','PT16S')
                lo=max(0,first-epoch*8);hi=min(8,edge-epoch*8)
                for template in period.iter(NS+'SegmentTemplate'):
                    template.set('initialization',f'epoch{epoch}/'+template.attrib['initialization']);template.set('media',f'epoch{epoch}/'+template.attrib['media']);template.set('startNumber',str(lo+1));template.set('presentationTimeOffset','0')
                    timeline=template.find(NS+'SegmentTimeline');entries=[];at=0
                    for item in timeline:
                        at=int(item.get('t',at));duration=int(item.attrib['d'])
                        for _ in range(int(item.get('r','0'))+1):entries.append((at,duration));at+=duration
                    entries=entries[:8];t,d=entries[-1];entries[-1]=(t,16*int(template.attrib['timescale'])-t);assert entries[-1][1]>0
                    timeline.clear()
                    for t,d in entries[lo:hi]:ET.SubElement(timeline,NS+'S',t=str(t),d=str(d))
                root.append(period)
            data=ET.tostring(root,encoding='utf-8',xml_declaration=True)
            (self.output/(hashlib.sha256(data).hexdigest()+'.manifest')).write_bytes(data)
            return 200,data,True
        match=re.fullmatch(r'dash/epoch(\d+)/(init-stream\d+\.m4s|chunk-stream\d+-(\d+)\.m4s)',name)
        if match:
            epoch=int(match[1]);number=int(match[3])-1 if match[3] else None
            if number is not None:
                index=epoch*8+number
                if not first<=index<edge:return (410 if index<first else 503),b'',False
            file=self.fixtures/'dash'/match[2]
            return (200,file.read_bytes(),False) if file.is_file() else (404,b'',False)
        return super().body(name)
