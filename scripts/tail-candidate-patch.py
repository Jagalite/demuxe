import pathlib,json,hashlib
root=pathlib.Path('build/tail-installed/package');p=root/'web/native-remux-player.js';s=p.read_text()
old="if(this.windowed&&this.media.readyState==='open'&&this.sbs.every(buffer=>buffer.buffered.length)){"
new="""// Closing a partial video lane marks its decoder ended. Later tail packets
  // can arrive behind the clock and leave the earlier frame held indefinitely.
  // Keep MSE open until a declared track has actually reached its source end.
  const laneComplete=this.sbs.some((buffer,lane)=>buffer.buffered.length&&buffer.buffered.end(buffer.buffered.length-1)-this.timelineBias>=(lane?this.trackBounds?.audioEnd:this.trackBounds?.videoEnd)-.002);
  if(this.windowed&&this.media.readyState==='open'&&laneComplete&&this.sbs.every(buffer=>buffer.buffered.length)){"""
assert s.count(old)==1;s=s.replace(old,new);p.write_text(s)
manifest=root/'release-manifest.json';m=json.loads(manifest.read_text());m['dirtySource']=True;m['sourceTag']=None;m['diagnosticPatch']={'baseArchiveSHA256':'4e934eec21c254eb20a970edab6613b654d77f6228ad118db1b6406551cfe9a2','description':'defer MSE window EOS until a source lane is complete; not a releasable archive'}
v=m['files']['web/native-remux-player.js'];v['bytes']=len(p.read_bytes());v['sha256']=hashlib.sha256(p.read_bytes()).hexdigest();manifest.write_text(json.dumps(m,indent=2)+'\n')
print('Diagnostic runtime patch',m['diagnosticPatch'],v)
