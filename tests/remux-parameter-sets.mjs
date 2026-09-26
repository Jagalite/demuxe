// SPDX-License-Identifier: Apache-2.0
// Exercises the production scanner without building FFmpeg or Wasm.
import test from 'node:test';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';

test('parameter-set comparison ignores byte-stream padding but rejects changed payloads',async()=>{
 const source=await readFile(new URL('../native/remux/remux.c',import.meta.url),'utf8');
 const scanner=source.slice(source.indexOf('static int visit_nal('),source.indexOf('static int configure_video('));
 const directory=await mkdtemp(path.join(tmpdir(),'demuxe-parameter-sets-'));
 try{
  await writeFile(path.join(directory,'scanner.c'),`
#include <assert.h>
#include <stdint.h>
#include <string.h>
static int hevc_video,repair_dts,hevc_picture_type,hevc_packet_metadata,config_count,config_sizes[64];
static uint8_t config_nals[64][4096];
static int reject(const char *message){(void)message;return -1;}
${scanner}
int main(void){
 const uint8_t init[]={0,0,0,1,0x67,0x64,0x80,0,0,1,0x68,0x80};
 const uint8_t padded[]={0,0,1,0x67,0x64,0x80,0,0,0,0,0,1,0x68,0x80,0,0};
 const uint8_t changed[]={0,0,1,0x67,0x65,0x80};
 const uint8_t changed_pps[]={0,0,1,0x68,0x81};
 assert(scan_nals(init,sizeof(init),0,1)==0);
 assert(scan_nals(padded,sizeof(padded),0,0)==0);
 assert(scan_nals(changed,sizeof(changed),0,0)<0);
 assert(scan_nals(changed_pps,sizeof(changed_pps),0,0)<0);
 config_count=0;
 assert(scan_nals(padded,sizeof(padded),0,1)==0);
 assert(scan_nals(init,sizeof(init),0,0)==0);
 const uint8_t length_prefixed[]={0,0,0,3,0x67,0x64,0x80,0,0,0,2,0x68,0x80};
 assert(scan_nals(length_prefixed,sizeof(length_prefixed),4,0)==0);
 assert(scan_nals(length_prefixed,sizeof(length_prefixed)-1,4,0)<0);
 hevc_video=1;config_count=0;
 const uint8_t vps[]={0,0,1,0x40,1,0x80};
 const uint8_t vps_padded[]={0,0,0,1,0x40,1,0x80,0,0};
 const uint8_t vps_changed[]={0,0,1,0x40,1,0x81};
 assert(scan_nals(vps,sizeof(vps),0,1)==0);
 assert(scan_nals(vps_padded,sizeof(vps_padded),0,0)==0);
 assert(scan_nals(vps_changed,sizeof(vps_changed),0,0)<0);
 return 0;
}
`);
  const binary=path.join(directory,'scanner');
  execFileSync(process.env.CC??'cc',['-std=c11','-Wall','-Wextra',path.join(directory,'scanner.c'),'-o',binary]);
  execFileSync(binary);
 }finally{await rm(directory,{recursive:true,force:true});}
});
