// SPDX-License-Identifier: LGPL-2.1-or-later
// Translation of FFmpeg h264dsp_template.c 8-bit luma filters.
// Copyright (c) 2003-2011 Michael Niedermayer; original LGPL notice retained beside run source.
@group(0) @binding(0) var<storage,read_write> pixels: array<i32>;
@group(0) @binding(1) var<storage,read> edges: array<i32>;
@compute @workgroup_size(1) fn main(@builtin(global_invocation_id) id: vec3<u32>){
 let z=id.x*9u;let kind=edges[z];let x=edges[z+1u];let y=edges[z+2u];let a=edges[z+3u];let b=edges[z+4u];let xs=select(1,64,(kind%2)==0);let ys=select(64,1,(kind%2)==0);
 for(var d=0;d<16;d++) {let q=y*64+x+d*ys;let p2=pixels[u32(q-3*xs)];let p1=pixels[u32(q-2*xs)];let p0=pixels[u32(q-xs)];let q0=pixels[u32(q)];let q1=pixels[u32(q+xs)];let q2=pixels[u32(q+2*xs)];
 if(abs(p0-q0)>=a||abs(p1-p0)>=b||abs(q1-q0)>=b){continue;}
 if(kind<2){let orig=edges[z+5u+u32(d/4)];if(orig<0){continue;}var tc=orig;
 if(abs(p2-p0)<b){if(orig!=0){pixels[u32(q-2*xs)]=p1+clamp(((p2+((p0+q0+1)>>1))>>1)-p1,-orig,orig);}tc++;}
 if(abs(q2-q0)<b){if(orig!=0){pixels[u32(q+xs)]=q1+clamp(((q2+((p0+q0+1)>>1))>>1)-q1,-orig,orig);}tc++;}
 let delta=clamp(((q0-p0)*4+(p1-q1)+4)>>3,-tc,tc);pixels[u32(q-xs)]=clamp(p0+delta,0,255);pixels[u32(q)]=clamp(q0-delta,0,255);
 }else{if(abs(p0-q0)<((a>>2)+2)){
 if(abs(p2-p0)<b){let p3=pixels[u32(q-4*xs)];pixels[u32(q-xs)]=(p2+2*p1+2*p0+2*q0+q1+4)>>3;pixels[u32(q-2*xs)]=(p2+p1+p0+q0+2)>>2;pixels[u32(q-3*xs)]=(2*p3+3*p2+p1+p0+q0+4)>>3;}else{pixels[u32(q-xs)]=(2*p1+p0+q1+2)>>2;}
 if(abs(q2-q0)<b){let q3=pixels[u32(q+3*xs)];pixels[u32(q)]=(p1+2*p0+2*q0+2*q1+q2+4)>>3;pixels[u32(q+xs)]=(p0+q0+q1+q2+2)>>2;pixels[u32(q+2*xs)]=(2*q3+3*q2+q1+q0+p0+4)>>3;}else{pixels[u32(q)]=(2*q1+q0+p1+2)>>2;}
 }else{pixels[u32(q-xs)]=(2*p1+p0+q1+2)>>2;pixels[u32(q)]=(2*q1+q0+p1+2)>>2;}}
 }
}
