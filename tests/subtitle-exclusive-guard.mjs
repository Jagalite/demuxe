// SPDX-License-Identifier: Apache-2.0
// Test-only host reservation for subtitle CPU attribution.
// Interrupt only known competing benchmark launchers, never Chrome or system services.
import {execFileSync} from 'node:child_process';

const patterns=[
 /^node experiments\/software-yuv-(?:integration|fidelity)\//,
 /^node tests\/(?:hybrid-presentation|hybrid-cpu|software-yuv)/,
 /^npm run build:software-yuv(?:\s|$)/,
];
const competingChrome=command=>command.includes('/Contents/MacOS/Google Chrome ')
 &&command.includes('playwright_chromiumdev_profile')
 &&command.includes('--remote-debugging-pipe');
const interrupted=new Set();
const rows=()=>execFileSync('ps',['-axo','pid=,ppid=,pgid=,command='],{encoding:'utf8'}).split('\n').map(line=>{
 const match=/^\s*(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/.exec(line);
 return match?{pid:Number(match[1]),ppid:Number(match[2]),pgid:Number(match[3]),command:match[4]}:null;
}).filter(Boolean);

console.log(JSON.stringify({event:'started',at:new Date().toISOString(),pid:process.pid}));
const timer=setInterval(()=>{
 for(const row of rows()){
  const browser=competingChrome(row.command);
  if(interrupted.has(row.pid)||!browser&&!patterns.some(pattern=>pattern.test(row.command)))continue;
  interrupted.add(row.pid);
  try{
   process.kill(browser?row.pid:-row.pgid,browser?'SIGTERM':'SIGINT');
   console.log(JSON.stringify({event:'interrupted',at:new Date().toISOString(),pid:row.pid,ppid:row.ppid,pgid:row.pgid,group:!browser,command:row.command}));
  }catch(error){console.log(JSON.stringify({event:'missed',at:new Date().toISOString(),pid:row.pid,error:String(error)}));}
 }
},1000);
process.on('SIGINT',()=>{clearInterval(timer);console.log(JSON.stringify({event:'stopped',at:new Date().toISOString()}));process.exit(0);});
