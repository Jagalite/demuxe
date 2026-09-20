# SPDX-License-Identifier: Apache-2.0
import pathlib,json,subprocess,hashlib,sys
p=pathlib.Path(sys.argv[1]);
def extract(file):
 b=file.read_bytes();packets=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_packets','-of','json',str(file)]))['packets'];out=[];layers={}
 for packet in packets:
  data=b[int(packet['pos']):int(packet['pos'])+int(packet['size'])];at=0;vcl=[]
  while at<len(data):
   n=int.from_bytes(data[at:at+4],'big');at+=4;nal=data[at:at+n];at+=n;layer=((nal[0]&1)<<5)|(nal[1]>>3);typ=(nal[0]>>1)&63;layers[layer]=layers.get(layer,0)+1
   if layer==0 and typ<32:vcl.append(hashlib.sha256(nal).hexdigest())
  out.append({'pts':packet['pts'],'dts':packet['dts'],'duration':packet.get('duration'),'baseVCL':vcl})
 return out,layers
a,al=extract(p/'source.mov');b,bl=extract(p/'base-edited.mp4');assert len(a)==len(b)==124;assert a==b;assert 1 in al and 1 not in bl
info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-of','json',str(p/'base-edited.mp4')]));assert len(info['streams'])==1;assert not info['streams'][0].get('view_ids_available');assert all(s['side_data_type'] not in ['Stereo 3D','Spherical Mapping'] for s in info['streams'][0].get('side_data_list',[]))
(p/'packet-proof.json').write_text(json.dumps({'packets':len(a),'sourceLayers':al,'outputLayers':bl,'allBaseVCLAndPTSDTSDurationExact':True,'records':b,'outputStereoMetadataAbsent':True,'singleLayerDecoderConfiguration':True,'videoOnlyScope':True},indent=2));print('all124basepackets/timestamps exact',al,bl)
