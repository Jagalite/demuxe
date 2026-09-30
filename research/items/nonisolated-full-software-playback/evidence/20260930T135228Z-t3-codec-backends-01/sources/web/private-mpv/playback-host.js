// SPDX-License-Identifier: MIT
// Experimental finite Software host. Every mpv operation is serialized through
// the continuation owner; no render/event timer may reenter suspended Wasm.
import {PrivatePCMTransport} from './playback-pcm.js';
export class PrivatePlaybackHost {
  constructor(engine, canvas, width, height, {fatalCommandErrors = true,retained} = {}) {
    this.engine = engine;
    this.canvas = canvas;
    this.context = canvas.getContext('2d', {willReadFrequently: true});
    this.width = canvas.width = width;
    this.height = canvas.height = height;
    this.tail = Promise.resolve();
    this.events = [];
    this.properties = {};
    this.draws = 0;
    this.closed = false;
    this.fatalCommandErrors = fatalCommandErrors;
    this.seekPreroll = 2;
    this.retained=retained;
  }
  serial(operation) {
    const next = this.tail.then(operation);
    this.tail = next.catch(() => {});
    return next;
  }
  async create(source, audioPort, latencyUs = 0) {
    return this.serial(async () => {
      this.engine.source.setSource(source);
      if(this.retained){await this.engine.call('web_decoder_enable',2);await this.engine.call('web_experiment_skip_render',1);}
      const rc = await this.engine.call('web_create', 48000);
      if (rc !== 0) throw Error('web_create: ' + rc);
      this.created = true;
      if (audioPort) this.audio = new PrivatePCMTransport(this.engine, await this.engine.call('web_audio_ptr'), audioPort, latencyUs,
        this.engine.raw.web_audio_capacity ? await this.engine.call('web_audio_capacity') : 8192);
    });
  }
  command(id, ...args) {
    if (!Number.isInteger(id) || id < 0 || id > 0xffffffff || args.length < 1 || args.length > 4 || args.some(a => typeof a !== 'string' || a.includes('\0') || a.length > 16384)) throw Error('Invalid native command');
    return this.serial(async () => {
      if (this.closed) throw Error('Playback host closed');
      const pointers = [];
      try {
        for (const arg of args) {
          const bytes = new TextEncoder().encode(arg + '\0');
          const ptr = await this.engine.call('malloc', bytes.length);
          if (!ptr) throw Error('Command allocation failed');
          pointers.push(ptr);
          new Uint8Array(this.engine.raw.memory.buffer).set(bytes, ptr);
        }
        const rc = await this.engine.call('web_command_args', id, ...pointers, ...Array(4 - pointers.length).fill(0));
        if (rc < 0) throw Error('Command rejected: ' + rc);
      } finally {
        for (const ptr of pointers) await this.engine.call('free', ptr);
      }
    });
  }
  addSubtitle(id, path, title, language, select) {
    if (![path,title,language].every(value=>typeof value==='string'&&!value.includes('\0')&&value.length<=4096)) throw Error('Invalid subtitle metadata');
    return this.serial(async()=>{
      if(this.closed)throw Error('Playback host closed');
      const pointers=[];
      try{
        for(const value of [path,title,language]){
          const bytes=new TextEncoder().encode(value+'\0'),ptr=await this.engine.call('malloc',bytes.length);
          if(!ptr)throw Error('Subtitle allocation failed');pointers.push(ptr);new Uint8Array(this.engine.raw.memory.buffer).set(bytes,ptr);
        }
        const rc=await this.engine.call('web_add_subtitle',id,...pointers,+select);
        if(rc<0)throw Error('Subtitle command rejected: '+rc);
      }finally{for(const ptr of pointers)await this.engine.call('free',ptr);}
    });
  }
  // Retain demux preroll before decoding to the requested exact position.
  // MPEG-TS demux seeking at an exact GOP boundary can otherwise start at the
  // following keyframe; ordinary exact seeking cannot recover earlier packets.
  // For the bounded <=60-second profile, rewind to the beginning rather than
  // assuming a GOP interval. Longer sources still require an access-point policy.
  async seek(id, position) {
    if (!Number.isFinite(position) || position < 0) throw Error('Invalid seek position');
    const duration = Number(this.properties.duration);
    const preroll = Number.isFinite(duration) && duration > 0 && duration <= 60
      ? Math.max(this.seekPreroll, Math.min(position + 1, duration)) : this.seekPreroll;
    await this.command(id, 'set', 'hr-seek-demuxer-offset', String(preroll));
    return this.command(id + 0x40000000, 'seek', String(position), 'absolute+exact');
  }
  pump(force = false) {
    return this.serial(async () => {
      if (this.closed) return [];
      if (this.audio?.error) throw Error(this.audio.error);
      if (this.sourceFailure) throw this.sourceFailure;
      const failures = this.engine.source.drainFailures().filter(failure => failure.generation === undefined || failure.generation === this.engine.source.generation);
      if (failures.length) {
        this.engine.source.cancelSource();
        this.sourceFailure = new Error('Source transport: ' + failures.map(failure => String(failure.cause ?? failure.kind)).join('; '), {cause: failures[0].cause});
        throw this.sourceFailure;
      }
      const events = [];
      for (let i = 0; i < 64; i++) {
        const ptr = await this.engine.call('web_event');
        if (!ptr) break;
        let event;
        try { event = JSON.parse(this.engine.module.UTF8ToString(ptr)); }
        finally { await this.engine.call('free', ptr); }
        if (event.event === 'property-change') this.properties[event.name] = event.data;
        if (this.fatalCommandErrors && event.event === 'command-reply' && event.error && event.error !== 'success')
          throw Error('Command reply failed: ' + JSON.stringify(event));
        events.push(event);
        this.events.push(event);
        if (this.events.length > 256) this.events.shift();
      }
      force=force||this.renderWidth!==this.width||this.renderHeight!==this.height;
      this.renderWidth=this.width;this.renderHeight=this.height;
      const ptr = await this.engine.call('web_render', this.width, this.height, +force);
      if(this.retained){
        if(ptr)await this.retained.select(this.engine,this.properties);
        if(this.retained.present(this.context,this.canvas)){await this.engine.call('web_presented');this.draws++;}
      }else if (ptr) {
        if (!this.imageData || this.imageData.width !== this.width || this.imageData.height !== this.height)
          this.imageData = new ImageData(this.width, this.height);
        const rgba = this.imageData.data;
        rgba.set(new Uint8ClampedArray(this.engine.raw.memory.buffer, ptr, rgba.length));
        for (let i = 3; i < rgba.length; i += 4) rgba[i] = 255;
        this.context.putImageData(this.imageData, 0, 0);
        await this.engine.call('web_presented');
        this.draws++;
      }
      return events;
    });
  }
  picture() { return this.context.getImageData(0, 0, this.width, this.height).data.slice(); }
  // Revoke pending reads before waiting for a command/render owning the queue.
  destroy() {
    this.engine.source.cancelSource();
    return this.serial(async () => {
      this.closed = true;
      const errors = [];
      let result;
      try { if (this.audio) await this.audio.stop(); }
      catch (error) { errors.push(error); }
      try {
        if (this.created) {
          await this.engine.call('web_destroy');
          this.created = false;
        }
      } catch (error) { errors.push(error); }
      try { result = {audio: this.audio?.snapshot(), scheduler: this.engine.scheduler.snapshot(), source: this.engine.source.snapshot()}; }
      catch (error) { errors.push(error); }
      try { this.engine.dispose(); }
      catch (error) { errors.push(error); }
      try {this.retained?.clear();}
      catch (error) {errors.push(error);}
      if (errors.length === 1) throw errors[0];
      if (errors.length > 1) throw new AggregateError(errors, 'Playback cleanup failed');
      return result;
    });
  }
}
