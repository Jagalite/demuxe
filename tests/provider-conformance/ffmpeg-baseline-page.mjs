// SPDX-License-Identifier: Apache-2.0
const token = new URL(location.href).searchParams.get('token'), status = document.querySelector('#status');
const endpoint = (name, index) => '/' + name + '?token=' + encodeURIComponent(token) + (index === undefined ? '' : '&index=' + index);
async function post(name, body, index) {
  const response = await fetch(endpoint(name, index), {method: 'POST', body});
  if (!response.ok) throw Error(await response.text()); return response.text();
}
const results = [];
try {
  const response = await fetch(endpoint('jobs')); if (!response.ok) throw Error(await response.text());
  const {jobs, timeout, maxInputBytes, maxOutputBytes} = await response.json();
  for (const job of jobs) {
    status.textContent = 'Preparing packaged FFmpeg baseline ' + (results.length + 1) + '/' + jobs.length;
    const worker = new Worker('/harness/ffmpeg-baseline-worker.mjs', {type: 'module'});
    try {
      const result = await new Promise(resolve => {
        const timer = setTimeout(() => resolve({error: 'Baseline Worker deadline exceeded'}), timeout);
        worker.onmessage = ({data}) => {clearTimeout(timer); resolve(data);};
        worker.onerror = event => {clearTimeout(timer); resolve({error: event.message});};
        worker.postMessage({...job, timeout, maxInputBytes, maxOutputBytes});
      });
      const row = JSON.parse(await post(result.error ? 'error' : 'output', result.error ? JSON.stringify(result) : result.output, job.index));
      results.push({...row, baselineStats: result.stats});
    } finally {worker.terminate();}
  }
  const metadata = {userAgent: navigator.userAgent, crossOriginIsolated, results};
  await post('complete', JSON.stringify(metadata));
  window.parityResults = metadata; status.textContent = JSON.stringify(metadata, null, 2);
} catch (error) {window.parityError = String(error.stack ?? error); status.textContent = window.parityError;}
