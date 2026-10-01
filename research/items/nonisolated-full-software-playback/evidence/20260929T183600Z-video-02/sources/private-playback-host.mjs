// SPDX-License-Identifier: MIT
// Experimental finite Software host. Every mpv operation is serialized through
// the continuation owner; no render/event timer may reenter suspended Wasm.
import {PrivatePCMTransport} from './private-pcm-transport.mjs';
export class PrivatePlaybackHost {
  constructor(engine, canvas, width, height) {
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
  }
  serial(operation) {
    const next = this.tail.then(operation);
    this.tail = next.catch(() => {});
    return next;
  }
  async create(source, audioPort, latencyUs = 0) {
    return this.serial(async () => {
      this.engine.source.setSource(source);
      const rc = await this.engine.call('web_create', 48000);
      if (rc !== 0) throw Error('web_create: ' + rc);
      this.created = true;
      if (audioPort) this.audio = new PrivatePCMTransport(this.engine, await this.engine.call('web_audio_ptr'), audioPort, latencyUs);
    });
  }
  command(id, ...args) {
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
  pump(force = false) {
    return this.serial(async () => {
      if (this.closed) return [];
      if (this.audio?.error) throw Error(this.audio.error);
      const events = [];
      for (let i = 0; i < 64; i++) {
        const ptr = await this.engine.call('web_event');
        if (!ptr) break;
        let event;
        try { event = JSON.parse(this.engine.module.UTF8ToString(ptr)); }
        finally { await this.engine.call('free', ptr); }
        if (event.event === 'property-change') this.properties[event.name] = event.data;
        if (event.event === 'command-reply' && event.error && event.error !== 'success')
          throw Error('Command reply failed: ' + JSON.stringify(event));
        events.push(event);
        this.events.push(event);
        if (this.events.length > 256) this.events.shift();
      }
      const ptr = await this.engine.call('web_render', this.width, this.height, +force);
      if (ptr) {
        const rgba = new Uint8ClampedArray(this.engine.raw.memory.buffer, ptr, this.width * this.height * 4).slice();
        for (let i = 3; i < rgba.length; i += 4) rgba[i] = 255;
        this.context.putImageData(new ImageData(rgba, this.width, this.height), 0, 0);
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
      if (this.audio) await this.audio.stop();
      if (this.created) await this.engine.call('web_destroy');
      const result = {audio: this.audio?.snapshot(), scheduler: this.engine.scheduler.snapshot(), source: this.engine.source.snapshot()};
      this.engine.dispose();
      return result;
    });
  }
}
