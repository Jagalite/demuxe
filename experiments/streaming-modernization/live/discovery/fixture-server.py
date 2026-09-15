#!/usr/bin/env python3
"""A short live DVR window whose oldest segment expires during discovery."""
import importlib.util,re
from pathlib import Path
spec=importlib.util.spec_from_file_location('base_origin',Path(__file__).resolve().parents[1]/'fixture-server.py')
base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)

class FixtureOrigin(base.FixtureOrigin):
    def __init__(self,*args,**kwargs):
        super().__init__(*args,window_seconds=86400,**kwargs)
        self.expired_discovery_requests=0
    def window(self):return (4,12)
    def body(self,name):
        # SegmentTimeline initially includes segment 4. By its first request
        # the origin has retired it. Remaining segments retain their real PTS.
        match=re.fullmatch(r'dash/chunk-stream\d+-([0-9]+)\.m4s',name)
        if match and int(match[1])==5:
            self.expired_discovery_requests+=1
            return 410,b'',False
        return super().body(name)
