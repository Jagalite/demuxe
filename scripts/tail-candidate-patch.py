import pathlib,json,hashlib
root=pathlib.Path('build/tail-installed/package')
p=root/'web/native-remux-player.js';s=p.read_text()
old="hasStartupCoverage(){return remuxStartupCoverage(this.target,this.duration,this.ranges());}"
new="""hasStartupCoverage(){
  const shortVideo=this.windowed&&this.trackBounds&&this.trackBounds.videoEnd<this.trackBounds.audioEnd&&this.trackBounds.videoEnd<=this.target+1;
  const b=this.sb?.buffered;
  return remuxStartupCoverage(this.target,this.duration,this.ranges())&&(!shortVideo||b?.length&&b.end(b.length-1)-this.timelineBias>=this.trackBounds.videoEnd-.002);
 }"""
assert s.count(old)==1;s=s.replace(old,new);p.write_text(s)
p2=root/'web/generated/internal/machine/remux-scheduling.js';s=p2.read_text()
old="if (state.windowed && !facts.targetReady && !state.primeVideo && remuxStartupCoverage(state.target, facts.duration, facts.ranges))"
new="""if (state.windowed && !facts.targetReady && !state.primeVideo && remuxStartupCoverage(state.target, facts.duration, facts.ranges) && !(state.trackBounds && state.trackBounds.videoEnd < state.trackBounds.audioEnd && state.trackBounds.videoEnd <= state.target + 1 && (facts.laneEnds?.[0] ?? -Infinity) < state.trackBounds.videoEnd - .002))"""
assert s.count(old)==1;s=s.replace(old,new);p2.write_text(s)
manifest=root/'release-manifest.json';m=json.loads(manifest.read_text());m['dirtySource']=True;m['sourceTag']=None;m['diagnosticPatch']={'baseArchiveSHA256':'4e934eec21c254eb20a970edab6613b654d77f6228ad118db1b6406551cfe9a2','description':'prepare the completed short video lane before accepting startup; not a releasable archive'}
for path in [p,p2]:
 v=m['files'][str(path.relative_to(root))];v['bytes']=len(path.read_bytes());v['sha256']=hashlib.sha256(path.read_bytes()).hexdigest()
manifest.write_text(json.dumps(m,indent=2)+'\n')
print('Diagnostic runtime patch',m['diagnosticPatch'])
