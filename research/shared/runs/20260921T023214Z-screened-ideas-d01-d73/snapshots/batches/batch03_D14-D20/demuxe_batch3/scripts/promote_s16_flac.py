"""Restricted FLAC S16 -> S24 numerical carrier lift using eight wasted bits.
Copies the original constant/verbatim sample bytes; no PCM expansion. It deliberately
marks output STREAMINFO MD5 as unknown (zero), rather than copying a now-invalid MD5.
Caller must retain a trusted source identity and verify the transformation separately.
SPDX-License-Identifier: MIT
"""

def crc(data:bytes,bits:int,poly:int)->int:
    value=0;mask=(1<<bits)-1
    for x in data:
        value^=x<<(bits-8)
        for _ in range(8):value=((value<<1)^poly if value&(1<<(bits-1)) else value<<1)&mask
    return value

def promote(data:bytes)->tuple[bytes,dict]:
    if data[:8]!=b'fLaC\x80\0\0\x22':raise ValueError('STREAMINFO-only profile required')
    conf=int.from_bytes(data[18:26],'big');bits=((conf>>36)&31)+1;channels=((conf>>41)&7)+1
    if bits!=16 or channels not in (1,2) or conf>>44!=48000:raise ValueError('S16 mono/stereo at 48k required')
    p=42;frames=[];payload_copied=0;count=0
    while p<len(data):
        start=p
        if data[p:p+4]!=bytes([255,248,0x7a,(channels-1)<<4]):raise ValueError('unsupported frame header')
        p+=4;lead=data[p];width=1
        if lead&128:
            width=0
            for bit in (128,64,32,16,8,4,2):
                if lead&bit:width+=1
                else:break
            if width not in (2,3,4,5,6) or any(x&192!=128 for x in data[p+1:p+width]):raise ValueError('bad coded number')
        p+=width
        n=int.from_bytes(data[p:p+2],'big')+1;p+=3
        if p>len(data) or crc(data[start:p],8,7):raise ValueError('bad header CRC')
        out=bytearray(data[start:p])
        for _ in range(channels):
            kind=data[p];p+=1
            if kind not in (0,2):raise ValueError('constant/verbatim without existing wasted bits only')
            sz=2 if kind==0 else 2*n
            out+=bytes([kind|1,1])+data[p:p+sz] # unary 00000001 denotes 8 wasted bits
            payload_copied+=sz;p+=sz
        p+=2
        if p>len(data) or crc(data[start:p],16,0x8005):raise ValueError('bad frame CRC')
        out+=crc(out,16,0x8005).to_bytes(2,'big');frames.append(bytes(out));count+=n
    if count!=(conf&((1<<36)-1)):raise ValueError('sample count mismatch')
    header=bytearray(data[:42]);header[12:15]=min(map(len,frames)).to_bytes(3,'big');header[15:18]=max(map(len,frames)).to_bytes(3,'big')
    header[18:26]=((conf&~(31<<36))|(23<<36)).to_bytes(8,'big');header[26:42]=bytes(16)
    result=bytes(header)+b''.join(frames)
    return result,{'frames':len(frames),'samples_per_channel':count,'channels':channels,'original_sample_payload_bytes_copied':payload_copied,'size_before':len(data),'size_after':len(result),'growth_bytes':len(result)-len(data),'pcm_expansion_performed':False,'output_streaminfo_md5':'unknown; zero field'}
