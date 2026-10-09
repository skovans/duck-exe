/** All sounds are synthesized in real time: no borrowed sound files or external assets. */
export class ChipAudio {
  private context: AudioContext | null = null;
  private lastStep = -1;
  private song = -1;
  private songTime = 0;
  private lastEvent = 0;
  muted = false;

  constructor() {
    try { this.muted = localStorage.getItem('duckexe-muted') === '1'; } catch { /* private browsing */ }
  }

  unlock(): void {
    try {
      if (!this.context) this.context = new AudioContext();
      if (this.context.state === 'suspended') void this.context.resume();
    } catch { /* WebAudio unavailable; gameplay is unaffected */ }
  }

  toggle(): boolean {
    this.muted = !this.muted;
    try { localStorage.setItem('duckexe-muted', this.muted ? '1' : '0'); } catch { /* ignore */ }
    if (!this.muted) this.unlock();
    return this.muted;
  }

  private tone(hz: number, length: number, volume: number, shape: OscillatorType = 'square', delay = 0): void {
    if (!this.context || this.muted || !Number.isFinite(hz)) return;
    const ctx = this.context;
    const now = ctx.currentTime + delay;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = shape;
      osc.frequency.setValueAtTime(hz, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(volume, now + 0.009);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + length);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now); osc.stop(now + length + 0.01);
    } catch { /* audio output may be unavailable */ }
  }

  fx(type: 'jump' | 'coin' | 'bad' | 'bounce' | 'hit' | 'gull' | 'portal' | 'bonus' | 'lose' | 'win' | 'phone' | 'checkpoint'): void {
    if (this.muted) return;
    const now = performance.now();
    if (type === 'coin' && now - this.lastEvent < 46) return;
    this.lastEvent = now;
    switch (type) {
      case 'jump': this.tone(420, .095, .044, 'square'); this.tone(560, .08, .025, 'sine', .055); break;
      case 'coin': this.tone(790, .08, .045); this.tone(1180, .13, .039, 'triangle', .065); break;
      case 'bad': this.tone(195, .17, .045, 'sawtooth'); this.tone(133, .13, .028, 'square', .07); break;
      case 'bounce': this.tone(360, .10, .035, 'triangle'); this.tone(620, .12, .045, 'square', .065); this.tone(920, .13, .03, 'square', .12); break;
      case 'hit': this.tone(240, .14, .05, 'sawtooth'); this.tone(110, .22, .05, 'triangle', .11); break;
      case 'gull': this.tone(700, .12, .044, 'sawtooth'); this.tone(515, .19, .03, 'sawtooth', .085); break;
      case 'portal': [392, 523, 659, 880, 1174].forEach((n, i) => this.tone(n, .16, .039, 'triangle', i * .08)); break;
      case 'bonus': [523, 659, 784, 1046].forEach((n, i) => this.tone(n, .14, .045, 'square', i * .065)); break;
      case 'checkpoint': [392, 523, 659].forEach((n, i) => this.tone(n, .14, .033, 'triangle', i * .075)); break;
      case 'lose': [392, 330, 262, 196].forEach((n, i) => this.tone(n, .24, .047, 'triangle', i * .16)); break;
      case 'win': [523, 659, 784, 1046, 784, 1046].forEach((n, i) => this.tone(n, .24, .047, 'square', i * .11)); break;
      case 'phone': this.tone(780, .19, .037, 'sine'); this.tone(980, .20, .027, 'sine', .11); this.tone(660, .24, .026, 'sawtooth', .32); break;
    }
  }

  musicTick(deltaMs: number, level: number): void {
    if (this.muted || !this.context) return;
    if (this.song !== level) { this.song = level; this.songTime = 0; this.lastStep = -1; }
    this.songTime += Math.min(deltaMs, 100);
    const beat = level === 2 ? 158 : level === 1 ? 148 : 136;
    const eighthMs = 60000 / beat / 2;
    const stepAbsolute = Math.floor(this.songTime / eighthMs);
    if (stepAbsolute === this.lastStep) return;
    this.lastStep = stepAbsolute;
    const step = stepAbsolute % 32;
    // Independent original melodies over a playful two-bar bass line.
    const riffs = [
      [72, 76, 79, 76, 74, 72, 69, -1, 72, 76, 81, 79, 76, 74, 72, -1,
       76, 79, 84, 79, 76, 74, 72, -1, 74, 76, 79, 76, 72, 69, 67, -1],
      [74, 77, 81, 77, 79, 77, 74, -1, 72, 74, 77, 81, 79, 77, 74, -1,
       77, 81, 84, 81, 79, 77, 76, -1, 74, 77, 79, 77, 74, 72, 69, -1],
      [69, 72, 76, 79, 76, 72, 69, -1, 68, 71, 75, 78, 75, 71, 68, -1,
       72, 76, 79, 84, 79, 76, 72, -1, 71, 75, 78, 83, 78, 75, 71, -1],
    ];
    const midiToHz = (note: number): number => 440 * 2 ** ((note - 69) / 12);
    const melody = riffs[level][step];
    if (melody > 0) this.tone(midiToHz(melody), .10, .010, 'square');
    if (step % 4 === 0) {
      const bassRoots = level === 2 ? [45, 44, 41, 40] : level === 1 ? [50, 45, 48, 45] : [48, 45, 43, 45];
      this.tone(midiToHz(bassRoots[Math.floor(step / 8) % 4]), .19, .015, 'triangle');
    }
    if (step % 8 === 4) this.tone(125, .058, .008, 'triangle');
  }

  resetSong(): void { this.song = -1; }
}
