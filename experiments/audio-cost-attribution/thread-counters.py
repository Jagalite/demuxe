# SPDX-License-Identifier: Apache-2.0
"""macOS per-thread CPU snapshots. pth_*_time is nanoseconds, not Mach ticks.
PROC_PIDLISTTHREADIDS (28) returns IDs matching Chrome trace thread IDs.
Errors and thread turnover are retained rather than silently counted as zero.
"""
import ctypes, json, os, sys, time
class ThreadInfo(ctypes.Structure):
    _fields_ = [('userNs', ctypes.c_uint64), ('systemNs', ctypes.c_uint64)] + [
        (n, ctypes.c_int32) for n in ['usage','policy','state','flags','sleep','currentPriority','priority','maxPriority']
    ] + [('name',ctypes.c_char*64)]
lib=ctypes.CDLL('/usr/lib/libproc.dylib',use_errno=True)
lib.proc_pidinfo.argtypes=[ctypes.c_int,ctypes.c_int,ctypes.c_uint64,ctypes.c_void_p,ctypes.c_int]
out={'at':time.monotonic(),'processes':[]}
for pid in map(int,sys.argv[1:] or [os.getpid()]):
    ids=(ctypes.c_uint64*4096)();count=lib.proc_pidinfo(pid,28,0,ids,ctypes.sizeof(ids))
    row={'pid':pid,'listBytes':count,'errno':ctypes.get_errno() if count<=0 else 0,'threads':[]};out['processes'].append(row)
    if count==ctypes.sizeof(ids):raise RuntimeError('Thread list may be truncated')
    for tid in list(ids)[:max(0,count)//8]:
        info=ThreadInfo();rc=lib.proc_pidinfo(pid,15,tid,ctypes.byref(info),ctypes.sizeof(info))
        row['threads'].append({'tid':tid,'returnBytes':rc,'errno':ctypes.get_errno() if rc!=ctypes.sizeof(info) else 0,'name':info.name.decode(errors='replace'),'userNs':info.userNs,'systemNs':info.systemNs})
out['endAt']=time.monotonic()
print(json.dumps(out))
