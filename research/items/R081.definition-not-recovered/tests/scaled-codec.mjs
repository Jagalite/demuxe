// SPDX-License-Identifier: Apache-2.0
// Restricted MPEG2 entropy observer and coalesced CPU reconstruction, no pixel-input shortcut.
const DCY=['100','00','01','101','110','1110','11110','111110','1111110','11111110','111111110','111111111'],DCC=['00','01','10','110','1110','11110','111110','1111110','11111110','111111110','1111111110','1111111111'],MV=['1','01','001','0001','000011','0000101','0000100','0000011','000001011','000001010','000001001','0000010001','0000010000','0000001111','0000001110','0000001101','0000001100'];
const assert=(v,m)=>{if(!v)throw Error(m)};
class Bits{constructor(b){this.b=b;this.i=0;}n(n){assert(this.i+n<=this.b.length*8,'truncated syntax');let v=0;for(let j=0;j<n;j++,this.i++)v=v*2+((this.b[this.i>>3]>>(7-(this.i&7)))&1);return v;}word(n){return this.n(n).toString(2).padStart(n,'0');}vlc(table){let w='';for(let i=0;i<16;i++){w+=this.n(1);const n=table.indexOf(w);if(n>=0)return n;}throw Error('unsupported VLC');}motion(){let n=this.vlc(MV);return n?(this.n(1)?-n:n):0;}padding(){while(this.i<this.b.length*8)assert(this.n(1)===0,'nonzero slice tail');}}
export function parseCompressed(data){
 const units=[];for(let i=0;i+3<data.length;i++)if(data[i]===0&&data[i+1]===0&&data[i+2]===1)units.push(i);
 let W=0,H=0,M=0,kind=0,coeff=null,pictures=[],current=null;
 for(let u=0;u<units.length;u++){const p=units[u],code=data[p+3],q=new Bits(data.subarray(p+4,units[u+1]??data.length));
  if(code===0xb3){W=q.n(12);H=q.n(12);assert(W===H&&[64,256,512].includes(W),'unsupported dimensions');M=W/16;coeff=new Int32Array(W*H*3/128);}
  else if(code===0){const temporal=q.n(10);kind=q.n(3);assert(q.n(16)===65535,'VBV profile');if(kind===1){assert(q.n(1)===0,'I header');}else{assert(kind===2&&q.word(4)==='0111'&&q.n(1)===0,'P header');current={temporal,vectors:[]};pictures.push(current);}}
  else if(code===0xb5&&kind){assert(q.word(4)==='1000','picture extension');assert(q.word(16)===(kind===1?'1111111111111111':'0001000111111111'),'fcode');assert(q.word(14)==='00110100000110','progressive/frame/DC precision');}
  else if(code>=1&&code<=M){assert(coeff,'sequence missing');assert(q.n(5)===2&&q.n(1)===0,'slice profile');let predictors=[128,128,128],last=0;
   for(let mx=0;mx<M;mx++){
    if(kind===1){assert(q.word(2)==='11','intra MB');for(let k=0;k<6;k++){const plane=k<4?0:k-3,size=q.vlc(plane?DCC:DCY);let delta=size?q.n(size):0;if(size&&delta<2**(size-1))delta-=2**size-1;predictors[plane]+=delta;assert(q.word(2)==='10','non-DC residual rejected');assert(predictors[plane]>=0&&predictors[plane]<=255,'DC sample range');const index=plane?W*H/64+(plane-1)*M*M+(code-1)*M+mx:((code-1)*2+Math.floor(k/2))*(W/8)+mx*2+k%2;coeff[index]=predictors[plane]*8;}}
    else{assert(kind===2&&q.word(4)==='1001','motion-only MB');last+=q.motion();const vy=q.motion();assert(last%4===0&&vy%4===0,'fractional chroma not supported');assert(mx*16+last/2>=0&&(mx+1)*16+last/2<=W&&(code-1)*16+vy/2>=0&&code*16+vy/2<=H,'out-of-frame motion');current.vectors.push([mx,code-1,last,vy]);}
   }q.padding();
  }
 }
 assert(coeff&&pictures.length===32&&pictures.every(p=>p.vectors.length===M*M),'complete I plus32 P profile');return{W,H,M,N:W*H*3/2,coeff,pictures};
}
export function reconstructCPU(s,capture=false,owner=null){
 const {W,H,M,N,coeff,pictures}=s;let a=owner?.a??new Uint8Array(N),b=owner?.b??new Uint8Array(N);const frames=[];
 for(let plane=0;plane<3;plane++){const w=plane?W/2:W,h=plane?H/2:H,off=plane?W*H+(plane-1)*W*H/4:0,co=plane?W*H/64+(plane-1)*M*M:0;
  for(let by=0;by<h/8;by++)for(let bx=0;bx<w/8;bx++){const value=coeff[co+by*(w/8)+bx]/8;for(let y=by*8;y<(by+1)*8;y++)a.fill(value,off+y*w+bx*8,off+y*w+(bx+1)*8);}
 }if(capture)frames.push(a.slice());
 for(const picture of pictures){
  // Coalesce adjacent same-motion MBs, then copy exact row intervals using typed-array bulk copy.
  const runs=[];for(let my=0;my<M;my++){let mx=0;while(mx<M){const v=picture.vectors[my*M+mx],start=mx;while(++mx<M){const n=picture.vectors[my*M+mx];if(n[2]!==v[2]||n[3]!==v[3])break;}runs.push([start,mx,my,v[2],v[3]]);}}
  for(let plane=0;plane<3;plane++){const w=plane?W/2:W,off=plane?W*H+(plane-1)*W*H/4:0,bs=plane?8:16,scale=plane?4:2;
   for(const [start,end,my,vx,vy]of runs){const x=start*bs,length=(end-start)*bs,dx=vx/scale,dy=vy/scale;for(let y=my*bs;y<(my+1)*bs;y++){const begin=off+(y+dy)*w+x+dx;b.set(a.subarray(begin,begin+length),off+y*w+x);}}
  }[a,b]=[b,a];if(capture)frames.push(a.slice());
 }return{output:a,frames};
}
