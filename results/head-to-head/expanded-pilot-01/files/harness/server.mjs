// SPDX-License-Identifier: Apache-2.0
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

export function byteRange(value, size) {
  if (!value) return {start: 0, end: size - 1, status: 200};
  const match = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!match || (!match[1] && !match[2])) return null;
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(size - 1, Number(match[2])) : size - 1;
  return Number.isSafeInteger(start) && Number.isSafeInteger(end) && start <= end && start < size
    ? {start, end, status: 206} : null;
}

export async function serve(assets, harness, log) {
  const hashes = new Map(), liveStarts = new Map();
  const requests = fs.createWriteStream(log, {flags: 'wx'});
  const types = {'.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript', '.wasm':'application/wasm',
    '.m3u8':'application/vnd.apple.mpegurl', '.mpd':'application/dash+xml', '.ts':'video/mp2t', '.webm':'video/webm', '.vtt':'text/vtt', '.mp4':'video/mp4', '.mkv':'video/x-matroska', '.ttf':'font/ttf', '.json':'application/json'};
  const server = http.createServer((req, res) => {
    const started = Date.now(); let bytes = 0;
    res.on('close', () => requests.write(JSON.stringify({started, url:req.url, range:req.headers.range,
      status:res.statusCode, bytes, elapsedMs:Date.now()-started}) + '\n'));
    for (const [k,v] of Object.entries({'Cross-Origin-Opener-Policy':'same-origin', 'Cross-Origin-Embedder-Policy':'require-corp',
      'Cross-Origin-Resource-Policy':'same-origin', 'Access-Control-Allow-Origin':'*', 'Cache-Control':'no-store'})) res.setHeader(k,v);
    try {
      if (!['GET','HEAD'].includes(req.method)) {res.writeHead(405).end(); return;}
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const isHarness = pathname.startsWith('/harness/');
      const base = fs.realpathSync(isHarness ? harness : assets);
      const name = isHarness ? pathname.slice('/harness/'.length) : pathname.slice(1);
      const file = fs.realpathSync(path.resolve(base, name));
      if (!file.startsWith(base + path.sep)) {res.writeHead(403).end(); return;}
      if(pathname.endsWith('/hls-live/index.m3u8')) {
        if(!liveStarts.has(file))liveStarts.set(file,Date.now());
        const original=fs.readFileSync(file,'utf8');
        const segments=[...original.matchAll(/#EXTINF:([^\n]+)\n([^#\n]+)\n/g)];
        const first=Math.min(Math.floor((Date.now()-liveStarts.get(file))/2000),Math.max(0,segments.length-3));
        const body='#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:2\n#EXT-X-MEDIA-SEQUENCE:'+first+'\n'+segments.slice(first,first+3).map(s=>'#EXTINF:'+s[1]+'\n'+s[2]+'\n').join('');
        requests.write(JSON.stringify({at:Date.now(),livePlaylist:body,url:req.url})+'\n');
        bytes=Buffer.byteLength(body);res.writeHead(200,{'Content-Type':'application/vnd.apple.mpegurl','Content-Length':bytes});res.end(req.method==='HEAD'?undefined:body);return;
      }
      const stat = fs.statSync(file);
      if (!stat.isFile()) throw Error('Not a file');
      if (!hashes.has(file)) hashes.set(file, createHash('sha256').update(fs.readFileSync(file)).digest('hex'));
      res.setHeader('ETag', '"'+hashes.get(file)+'"');
      res.setHeader('Accept-Ranges','bytes');
      const range = byteRange(req.headers.range, stat.size);
      if (!range) {res.writeHead(416, {'Content-Range':`bytes */${stat.size}`}).end(); return;}
      const {start,end,status} = range;
      if (status === 206) res.setHeader('Content-Range',`bytes ${start}-${end}/${stat.size}`);
      res.writeHead(status, {'Content-Type':types[path.extname(file)] || 'application/octet-stream', 'Content-Length':end-start+1});
      if (req.method === 'HEAD') {res.end(); return;}
      const stream = fs.createReadStream(file, {start,end});
      stream.on('data', part => bytes += part.length);
      stream.on('error', () => res.destroy());
      res.on('close', () => stream.destroy());
      stream.pipe(res);
    } catch {if (!res.headersSent) res.writeHead(404); res.end();}
  });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  return {origin:'http://127.0.0.1:'+server.address().port, close:async () => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await new Promise(resolve => requests.end(resolve));
  }};
}
