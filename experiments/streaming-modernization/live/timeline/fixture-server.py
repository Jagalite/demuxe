#!/usr/bin/env python3
"""Explicitly finish a rolling presentation, retaining its final DVR window."""
import importlib.util,hashlib
from pathlib import Path
import xml.etree.ElementTree as ET
spec=importlib.util.spec_from_file_location('rolling_fixture',Path(__file__).resolve().parents[1]/'fixture-server.py')
base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
class FixtureOrigin(base.FixtureOrigin):
    final_window=None
    def window(self):
        return self.final_window or super().window()
    def body(self,name):
        if name=='finish':
            self.final_window=self.window()
            return 200,b'finished',True
        status,data,mutable=super().body(name)
        if status==200 and mutable and self.final_window:
            if name.endswith('.m3u8'):
                data+=b'#EXT-X-ENDLIST\n'
            elif name=='dash/manifest.mpd':
                root=ET.fromstring(data)
                for key in ['availabilityStartTime','publishTime','minimumUpdatePeriod','timeShiftBufferDepth','suggestedPresentationDelay']:root.attrib.pop(key,None)
                root.set('type','static');root.set('mediaPresentationDuration',f'PT{self.final_window[1]*2}S')
                data=ET.tostring(root,encoding='utf-8',xml_declaration=True)
            (self.output/(hashlib.sha256(data).hexdigest()+'.manifest')).write_bytes(data)
        return status,data,mutable
