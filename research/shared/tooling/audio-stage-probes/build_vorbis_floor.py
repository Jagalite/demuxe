# SPDX-License-Identifier: Apache-2.0
import pathlib,subprocess,sys,json,tarfile
root=pathlib.Path('/tmp/demuxe-vorbis-floor/libvorbis-1.3.7');p=pathlib.Path(sys.argv[1]);p.mkdir(parents=True,exist_ok=True);src=root/'lib/mapping0.c';text=tarfile.open('/tmp/demuxe-vorbis-floor/libvorbis-1.3.7.tar.xz').extractfile('libvorbis-1.3.7/lib/mapping0.c').read().decode();marker="  /* channel coupling can 'dirty' the nonzero listing */";patch='''  /* Research-only instrumented floor output, before any residue or inverse MDCT. */
  for(i=0;i<vi->channels;i++){
    int submap=info->chmuxlist[i];
    float *curve=alloca(sizeof(float)*n/2);
    long long sequence=vb->sequence;
    int count=n/2;
    for(j=0;j<n/2;j++)curve[j]=1.f;
    _floor_P[ci->floor_type[info->floorsubmap[submap]]]->inverse2(vb,b->flr[info->floorsubmap[submap]],floormemo[i],curve);
    fwrite(&sequence,sizeof(sequence),1,stdout);
    fwrite(&i,sizeof(i),1,stdout);
    fwrite(&count,sizeof(count),1,stdout);
    fwrite(curve,sizeof(float),count,stdout);
  }
  if(getenv("DEMUXE_FLOOR_ONLY"))return 0;
'''
assert text.count(marker)==1;src.write_text(text.replace(marker,patch+'\n'+marker));(p/'snapshots').mkdir(exist_ok=True);(p/'snapshots/mapping0-instrumented.c').write_text(src.read_text());(p/'snapshots/COPYING').write_bytes((root/'COPYING').read_bytes());commands=[]
for args in [['./configure','--disable-shared','--enable-static','--with-ogg=/opt/homebrew/opt/libogg'],['make','-C','lib','-j4','libvorbis.la']]:
 r=subprocess.run(args,cwd=root,capture_output=True);commands.append({'cwd':str(root),'args':args,'exit':r.returncode});(p/('configure.log'if args[0]=='./configure'else'build.log')).write_bytes(r.stdout+r.stderr);assert r.returncode==0
(p/'build-commands.json').write_text(json.dumps(commands,indent=2));print(root/'lib/.libs/libvorbis.a')
