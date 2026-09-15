export class Adapter {
    constructor(container, options = {}) { this.codec = options.codec || 'opus'; this.bufferedSeek = !!options.bufferedSeek; this.firstFragmentMs = options.firstFragmentMs || 0; this.verifyLossless = !!options.verifyLossless; this.timing = options.openBegin ? {openBegin: options.openBegin} : {}; this.startReference = options.started; this.mark = key => { if (this.timing[key] === undefined) this.timing[key] = performance.timeOrigin + performance.now(); }; this.container = container; this.video = document.createElement('video'); this.video.style.cssText = 'width:960px;height:540px'; this.video.volume = 1; this.video.playsInline = true; container.append(this.video); this.generation = 0; this.pending = new Map(); this.serial = 0; this.errors = []; this.history = []; this.fragments = []; this.discardedBufferedBytesUpperBound = 0; this.peakFutureConverted = 0; this.discardedBytes = 0; this.staleRejected = 0; this.peakRetainedBytes = 0; this.ownedWorkers = 0; this.stats = {}; this.inflight = false; this.filling = true; this.destroyed = false; this.retainedBytes = 0; this.stalls = 0; this.firstFrameMs = null; this.firstAudioMs = null; this.context = new AudioContext(); this.analyser = this.context.createAnalyser(); this.mediaNode = this.context.createMediaElementSource(this.video); this.mediaNode.connect(this.analyser); this.analyser.connect(this.context.destination); this.video.addEventListener('canplay', () => this.mark('videoPlayable')); this.video.addEventListener('playing', () => this.mark('playingEvent')); this.video.addEventListener('waiting', () => this.stalls++); this.video.addEventListener('error', () => this.errors.push('video ' + this.video.error?.message)); this.timer = setInterval(() => this.pump().catch(e => { if (!this.destroyed)
        this.errors.push(String(e)); }), 100); this.audioTimer = setInterval(() => { const a = this.audio(); if (this.firstAudioMs === null && a.rms > .001) {
        this.firstAudioMs = performance.now() - this.started; this.mark('firstAudioOutput');
        clearInterval(this.audioTimer);
    } }, 20); }
    audio() { const a = new Float32Array(2048); this.analyser.getFloatTimeDomainData(a); return { rms: Math.sqrt(a.reduce((n, x) => n + x * x, 0) / a.length), state: this.context.state, sampleRate: this.context.sampleRate, channels: 2 }; }
    call(type, data = {}, worker = this.worker, gen = this.generation) { const id = ++this.serial; return new Promise((resolve, reject) => { const timer = setTimeout(() => { this.pending.delete(id); reject(Error(type + ' timeout')); }, 15000); this.pending.set(id, { resolve, reject, timer, gen }); try { if(!worker)throw Error('worker unavailable'); worker.postMessage({ type, id, gen, ...data }); } catch(error) { clearTimeout(timer); this.pending.delete(id); reject(error); } }); }
    retire() { if(this.retirement)return this.retirement; const task=this._retire();this.retirement=task;return task.finally(()=>{if(this.retirement===task)this.retirement=null}); }
    async _retire() { const worker = this.worker; if (!worker)
        return; const old = this.workerGeneration; this.worker = null; this.ready = false; try {
        if(worker.riskFailed)throw Error('worker failed; terminating owned worker'); const r = await this.call('destroy', {}, worker, old);
        this.history.push({ gen: old, cleanup: r, stats: this.stats, position: this.video.currentTime, unwatchedEncodedSeconds: Math.max(0, (r.stats.encoderLastPacketEnd ?? 0) - this.video.currentTime) });
    }
    catch (e) {
        this.history.push({ gen: old, forced: true, error: String(e), stats: this.stats });
    }
    finally {
        worker.terminate();
        this.ownedWorkers--;
        for (const [id, p] of this.pending)
            if (p.gen === old) {
                clearTimeout(p.timer);
                p.reject(Error('retired'));
                this.pending.delete(id);
            }
    } }
    async reset(target = 0) { if(this.destroyed)throw Error('retired'); this.ready = false; this.video.pause(); const gen = ++this.generation; this.discardedBufferedBytesUpperBound += this.fragments.filter(f => f.end > this.video.currentTime).reduce((n, f) => n + f.bytes, 0); this.fragments = []; await this.retire(); if(this.destroyed||gen!==this.generation)throw Error('retired'); this.sessionSource=this.url; this.sessionCodec=this.codec; if (this.objectURL) {
        this.video.removeAttribute('src');
        this.video.load();
        URL.revokeObjectURL(this.objectURL);
        this.objectURL = null;
    } this.stats = {}; this.retainedBytes = 0; this.filling = true; this.inflight = false; this.target = target; this.positionSet = false; this.offsetSet = false; this.eof = false; this.workerGeneration = gen; this.worker = new Worker('/risk/worker.js'); this.ownedWorkers++; this.worker.onmessage = ({ data: r }) => { const p = this.pending.get(r.id); if (!p) {
        if (r.bytes) {
            this.discardedBytes += r.bytes.length;
            this.staleRejected++;
        }
        return;
    } clearTimeout(p.timer); this.pending.delete(r.id); if (r.gen !== p.gen) {
        this.staleRejected++;
        this.discardedBytes += r.bytes?.length || 0;
        p.reject(Error('wrong generation'));
    }
    else if (r.error)
        p.reject(Error(r.error));
    else
        p.resolve(r); }; this.worker.onerror = e => { if(gen!==this.generation||this.destroyed)return; this.errors.push('worker ' + e.message);this.ready=false;this.worker.riskFailed=true;for(const [id,p] of this.pending){if(p.gen===gen){clearTimeout(p.timer);p.reject(Error('worker '+e.message));this.pending.delete(id)}} }; this.ms = new MediaSource(); this.objectURL = URL.createObjectURL(this.ms); this.video.src = this.objectURL; await new Promise((resolve,reject)=>{const ms=this.ms;const done=()=>{clearTimeout(timer);ms.removeEventListener('sourceopen',done);if(this.openWaitCancel===cancel)this.openWaitCancel=null;resolve()};const cancel=()=>{clearTimeout(timer);ms.removeEventListener('sourceopen',done);if(this.openWaitCancel===cancel)this.openWaitCancel=null;reject(Error('retired'))};const timer=setTimeout(()=>{ms.removeEventListener('sourceopen',done);if(this.openWaitCancel===cancel)this.openWaitCancel=null;reject(Error('MSE sourceopen timeout'))},5000);this.openWaitCancel=cancel;ms.addEventListener('sourceopen',done,{once:true});}); if (gen !== this.generation || this.destroyed)
        throw Error('retired'); this.mime = `video/mp4; codecs="avc1.42c01f,${this.codec === 'flac' ? 'fLaC' : 'opus'}"`; if (!MediaSource.isTypeSupported(this.mime)) throw Error('Unsupported '+this.mime); this.sb = this.ms.addSourceBuffer(this.mime); this.sb.addEventListener('error', () => this.errors.push('SourceBuffer error')); this.ms.duration = 90; const r = await this.call('init', { url: this.url, target, codec: this.codec, verifyLossless: this.verifyLossless, firstFragmentMs: this.firstFragmentMs }); await this.accept(r, gen); if(this.destroyed||gen!==this.generation)throw Error('retired'); this.ready = true; await this.pump(); }
    async open(url) { this.url = url; this.started = this.startReference ?? performance.now(); this.mark('openBegin'); this.firstFrameMs = null; this.firstAudioMs = null; this.video.requestVideoFrameCallback(() => { this.firstFrameMs = performance.now() - this.started; this.mark('firstVideoFrame'); }); await this.context.resume(); await this.reset(0); }
    async accept(r, gen) { if (gen !== this.generation || this.destroyed) {
        this.discardedBytes += r.bytes?.length || 0;
        this.staleRejected++;
        return;
    } this.stats = r.stats; this.peakFutureConverted = Math.max(this.peakFutureConverted, (r.stats.audioMaxPTS ?? 0) - (this.positionSet ? this.video.currentTime : this.target)); this.eof = r.eof; const b = r.bytes; if (!b?.length)
        return; if (!this.offsetSet) {
        this.sb.timestampOffset = r.stats.sourceMinPTS;
        this.timestampOffset = r.stats.sourceMinPTS;
        this.offsetSet = true;
    } this.retainedBytes += b.length; this.peakRetainedBytes = Math.max(this.peakRetainedBytes, this.retainedBytes); if (this.retainedBytes > 8 * 1024 * 1024)
        throw Error('main output byte cap'); try {
        await new Promise((resolve, reject) => { const done = () => { this.sb.removeEventListener('error', bad); resolve(); }, bad = () => { this.sb.removeEventListener('updateend', done); reject(Error('append error')); }; this.sb.addEventListener('updateend', done, { once: true }); this.sb.addEventListener('error', bad, { once: true }); this.mark('firstMSEAppend'); this.sb.appendBuffer(b); });
    }
    finally {
        if(gen===this.generation)this.retainedBytes -= b.length;
    } if(this.destroyed||gen!==this.generation){this.staleRejected++;this.discardedBytes+=b.length;return;} this.fragments.push({ bytes: b.length, end: this.ranges().at(-1)?.[1] ?? 0 }); }
    ranges() { const b = this.video.buffered; return Array.from({ length: b.length }, (_, i) => [b.start(i), b.end(i)]); }
    async pump() { if (!this.ready || this.inflight || this.destroyed || this.eof)
        return; const ranges = this.ranges(); const end = ranges.at(-1)?.[1] ?? 0; const pos = this.positionSet ? this.video.currentTime : this.target; if (end - pos < 5)
        this.filling = true; if (end - pos >= 10)
        this.filling = false; if (!this.filling)
        return; if ((this.stats.audioMaxPTS ?? pos) - pos > 13)
        throw Error('conversion exceeded 13s future allowance'); this.inflight = true; const gen = this.generation; try {
        const r = await this.call('step');
        await this.accept(r, gen);
        if (gen !== this.generation)
            return;
        const ranges = this.ranges();
        if (!this.positionSet && ranges.some(([a, b]) => a <= this.target + .1 && b > this.target + .5)) {
            this.video.currentTime = Math.max(this.target, ranges[0][0]);
            this.positionSet = true;
            if (!this.wantPause)
                await this.video.play();
        }
        if (this.eof && this.ms.readyState === 'open')
            this.ms.endOfStream();
        if (this.video.currentTime > 25 && this.sb.buffered.length && this.sb.buffered.start(0) < this.video.currentTime - 20) {
            await new Promise((resolve, reject) => { this.sb.addEventListener('updateend', resolve, { once: true }); this.sb.remove(0, this.video.currentTime - 15); });
        }
    }
    catch (e) {
        if (gen !== this.generation || this.destroyed || (e.name === 'AbortError' && this.wantPause && this.video.paused))
            return;
        throw e;
    }
    finally {
        if (gen === this.generation)
            this.inflight = false;
    } if (gen === this.generation && this.filling && !this.eof && !this.destroyed)
        setTimeout(() => this.pump().catch(e => { if (!this.destroyed)
            this.errors.push(String(e)); }), 0); }
    async pause() { this.wantPause = true; this.video.pause(); }
    async play() { this.wantPause = false; await this.context.resume(); if (this.positionSet)
        await this.video.play(); }
    seek(target, options = {}) {
        if(!Number.isFinite(target)||target<0)return Promise.reject(Error('invalid seek target'));
        const task=(this.seekQueue||Promise.resolve()).catch(()=>{}).then(()=>{if(this.destroyed)throw Error('retired');return this._seek(target,options)});this.seekQueue=task;return task;
    }
    async _seek(target, {forceRestart=false} = {}) {
        const safe=this.sessionSource===this.url&&this.sessionCodec===this.codec&&this.bufferedSeek&&!forceRestart&&this.ready&&!this.destroyed&&!this.inflight&&!this.sb?.updating&&this.ranges().some(([a,b])=>target>=a+.25&&target<=b-.5);
        if(safe){const at=performance.now(),worker=this.worker,ms=this.ms,sb=this.sb,gen=this.generation,wasPaused=this.video.paused;
            await new Promise((resolve,reject)=>{let frameId,seeked=false,frame=false;const cleanup=()=>{clearTimeout(timer);this.video.removeEventListener('seeked',done);if(frameId)this.video.cancelVideoFrameCallback(frameId)};const finish=()=>{if(seeked&&frame){cleanup();resolve()}};const done=()=>{seeked=true;finish()};const next=(_,m)=>{if(Math.abs(m.mediaTime-target)<.15){frame=true;finish()}else frameId=this.video.requestVideoFrameCallback(next)};const timer=setTimeout(()=>{cleanup();reject(Error('buffered seek timed out'))},3000);this.video.addEventListener('seeked',done);frameId=this.video.requestVideoFrameCallback(next);this.video.currentTime=target;});
            if(wasPaused)this.video.pause();return {milliseconds:performance.now()-at,target,position:this.video.currentTime,kind:'buffered',sameWorker:worker===this.worker,sameMSE:ms===this.ms,sameSourceBuffer:sb===this.sb,sameGeneration:gen===this.generation};
        }
        const at = performance.now(); await this.reset(target); while (!this.positionSet) {
        if (this.errors.length)
            throw Error(this.errors.join('\n'));
        if (performance.now() - at > 15000)
            throw Error('seek recovery timeout');
        await new Promise(r => setTimeout(r, 25));
    } return { milliseconds: performance.now() - at, target, position: this.video.currentTime, kind: 'restart' }; }
    snapshot() { const q = this.video.getVideoPlaybackQuality(); return { route: 'adapted-native', codec: this.codec, timing: {...this.stats.timing,...this.timing}, timestampOffset: this.timestampOffset, generation: this.generation, position: this.video.currentTime, paused: this.video.paused, ranges: this.ranges(), stats: this.stats, firstFrameMs: this.firstFrameMs, firstAudioMs: this.firstAudioMs, frames: q.totalVideoFrames - q.droppedVideoFrames, dropped: q.droppedVideoFrames, stalls: this.stalls, audio: this.audio(), errors: [...this.errors], filling: this.filling, inflight: this.inflight, retainedBytes: this.retainedBytes, peakRetainedBytes: this.peakRetainedBytes, discardedBytes: this.discardedBytes, discardedBufferedBytesUpperBound: this.discardedBufferedBytesUpperBound, peakFutureConverted: this.peakFutureConverted, staleRejected: this.staleRejected, workers: this.ownedWorkers, history: this.history }; }
    destroy() { return this.destroyPromise ||= this._destroy(); }
    async _destroy() { this.destroyed = true; this.ready=false;this.generation++;this.openWaitCancel?.(); clearInterval(this.timer); clearInterval(this.audioTimer); this.video.pause(); await this.retire(); this.video.removeAttribute('src'); this.video.load(); if (this.objectURL)
        URL.revokeObjectURL(this.objectURL); this.objectURL = null; this.video.remove(); this.mediaNode.disconnect(); this.analyser.disconnect(); await this.context.close(); this.retainedBytes = 0; this.fragments=[]; return { workers: this.ownedWorkers, pending: this.pending.size, retainedBytes: this.retainedBytes, objectURL: this.objectURL, audioState: this.context.state, history: this.history, errors: this.errors }; }
}
