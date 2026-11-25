// audio.js — tiny WebAudio beeps, OFF by default. One clear job: kitchen sounds
// with no audio files and no network. Press M (or the speaker button) to turn on.

export class SoundBank {
  constructor() {
    this.enabled = false;
    this.context = null;
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) this.ensureContext();
    return this.enabled;
  }

  ensureContext() {
    if (!this.context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) this.context = new AudioContextClass();
    }
    if (this.context && this.context.state === 'suspended') this.context.resume();
    return this.context;
  }

  tone(freq, dur, type = 'sine', gain = 0.08) {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    amp.gain.setValueAtTime(gain, ctx.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(amp).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }

  chop() { this.tone(180, 0.08, 'square', 0.06); }
  sizzle() { this.tone(520, 0.12, 'sawtooth', 0.03); }
  ding() { this.tone(880, 0.25, 'sine', 0.1); this.tone(1320, 0.3, 'sine', 0.06); }
  fail() { this.tone(160, 0.3, 'sawtooth', 0.07); }
  pop() { this.tone(440, 0.07, 'triangle', 0.07); }
}
