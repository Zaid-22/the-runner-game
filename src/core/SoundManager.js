export class SoundManager {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.45;
    this.masterGain.connect(this.ctx.destination);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.95;
    this.sfxGain.connect(this.masterGain);
    this.uiGain = this.ctx.createGain();
    this.uiGain.gain.value = 0.85;
    this.uiGain.connect(this.masterGain);
    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.value = 0.42;
    this.ambientGain.connect(this.masterGain);

    this.buffers = {};
    this.generateBuffers();
  }

  generateBuffers() {
    // White Noise Buffer
    const bufferSize = this.ctx.sampleRate * 2; // 2 seconds
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.buffers.noise = buffer;
  }

  playShoot(type) {
    if (this.ctx.state === "suspended") this.ctx.resume();
    const t = this.ctx.currentTime;

    if (type === "hitscan") {
      // PISTOL: Crisp, satisfying crack
      // Sharp attack
      this.playTone(1800, "square", 0.03, 0.8, 0.01, t);
      this.playTone(900, "sawtooth", 0.05, 0.6, 0.01, t);

      // Body punch
      this.playTone(150, "sine", 0.12, 0.7, 0.01, t);
      this.playNoise(t, 0.08, "bandpass", 1500, 0.9, 0.01);

      // Tail
      this.playNoise(t + 0.05, 0.15, "highpass", 2500, 0.3, 0.01);
    } else if (type === "shotgun") {
      // SHOTGUN: thick close-range blast with a short mechanical tail
      this.playNoise(t, 0.03, "highpass", 4200, 0.5, 0.02); // Muzzle crack
      this.playTone(62, "sine", 0.22, 1.0, 0.02, t); // Low boom
      this.playTone(98, "triangle", 0.18, 0.82, 0.02, t); // Body weight
      this.playTone(340, "sawtooth", 0.09, 0.52, 0.02, t); // Bark
      this.playNoise(t + 0.015, 0.22, "bandpass", 900, 0.58, 0.02); // Air blast
      this.playNoise(t + 0.05, 0.28, "lowpass", 520, 0.35, 0.01); // Tail
      this.playTone(1040, "square", 0.045, 0.2, 0.01, t + 0.08); // Action click
    } else if (type === "projectile") {
      // ROCKET: Deep thump + whoosh
      // Massive bass
      this.playTone(35, "sine", 0.4, 1.3, 0.01, t);
      this.playTone(60, "triangle", 0.35, 1.0, 0.01, t);

      // Whoosh sweep
      const osc = this.ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(100, t);
      osc.frequency.exponentialRampToValueAtTime(1200, t + 0.5);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.9, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.6);

      // Air blast
      this.playNoise(t, 0.5, "bandpass", 1800, 0.8, 0.01);
    }
  }

  playExplosion() {
    if (this.ctx.state === "suspended") this.ctx.resume();
    const t = this.ctx.currentTime;

    // 1. Deep Rumble (Low-pass Noise)
    this.playNoise(t, 1.5, "lowpass", 300, 1.5, 0.01);

    // 2. Debris Crackle (High-pass Noise)
    this.playNoise(t, 1.0, "highpass", 1000, 0.8, 0.01);

    // 3. Sub-bass shockwave
    this.playTone(50, "sine", 1.0, 1.0, 0.01, t);
  }

  // --- Monster Sounds ---

  playMonsterGrowl() {
    if (this.ctx.state === "suspended") this.ctx.resume();
    const t = this.ctx.currentTime;

    // Low frequency growl
    const osc = this.ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.linearRampToValueAtTime(120, t + 0.3);
    osc.frequency.linearRampToValueAtTime(60, t + 0.6);

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 200;
    filter.Q.value = 5;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, t); // Louder! Was 0.3
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.8);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.8);
  }

  playBossRoar() {
    if (this.ctx.state === "suspended") this.ctx.resume();
    const t = this.ctx.currentTime;

    // Deep, layered roar
    const osc1 = this.ctx.createOscillator();
    osc1.type = "sawtooth";
    osc1.frequency.setValueAtTime(40, t);
    osc1.frequency.linearRampToValueAtTime(80, t + 0.5);
    osc1.frequency.linearRampToValueAtTime(30, t + 1.5);

    const osc2 = this.ctx.createOscillator();
    osc2.type = "square";
    osc2.frequency.setValueAtTime(60, t);
    osc2.frequency.linearRampToValueAtTime(120, t + 0.5);

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.buffers.noise;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(150, t);
    filter.frequency.linearRampToValueAtTime(300, t + 1.5);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 2.0);

    osc1.connect(filter);
    osc2.connect(filter);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(t);
    osc2.start(t);
    noise.start(t);
    osc1.stop(t + 2.0);
    osc2.stop(t + 2.0);
    noise.stop(t + 2.0);
  }

  playWaveComplete() {
    if (this.ctx.state === "suspended") this.ctx.resume();
    const t = this.ctx.currentTime;

    // Victory jingle
    const notes = [523, 659, 784, 1047]; // C, E, G, C
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.3, t + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.01, t + i * 0.15 + 0.3);

      osc.connect(gain);
      gain.connect(this.uiGain);

      osc.start(t + i * 0.15);
      osc.stop(t + i * 0.15 + 0.3);
    });
  }

  playWaveStart() {
    if (this.ctx.state === "suspended") this.ctx.resume();
    const t = this.ctx.currentTime;

    // Tension build
    const osc = this.ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.linearRampToValueAtTime(400, t + 1.0);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.linearRampToValueAtTime(0.4, t + 1.0);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 1.2);

    osc.connect(gain);
    gain.connect(this.uiGain);

    osc.start(t);
    osc.stop(t + 1.2);
  }

  // --- Helpers ---

  playTone(freq, type, duration, vol, endVol, t, targetGain = this.sfxGain) {
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(endVol || 0.01, t + duration);

    osc.connect(gain);
    gain.connect(targetGain || this.sfxGain);
    osc.start(t);
    osc.stop(t + duration);
  }

  playNoise(t, duration, filterType, filterFreq, vol, endVol, targetGain = this.sfxGain) {
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.buffers.noise;

    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFreq, t);
    if (filterType === "lowpass") {
      filter.frequency.exponentialRampToValueAtTime(100, t + duration);
    }

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(endVol || 0.01, t + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(targetGain || this.sfxGain);

    noise.start(t);
    noise.stop(t + duration);
  }

  playClick() {
    if (this.ctx.state === "suspended") this.ctx.resume();
    const t = this.ctx.currentTime;
    // Mechanical click
    this.playTone(1200, "sine", 0.05, 0.18, 0.01, t, this.uiGain);
  }

  playFootstep() {
    if (this.ctx.state === "suspended") this.ctx.resume();
    const t = this.ctx.currentTime;
    // Thud sound
    this.playNoise(t, 0.05, "lowpass", 200, 0.36, 0.01, this.sfxGain);
  }

  startAmbient() {
    if (this.ctx.state === "suspended") this.ctx.resume();
    if (this.ambientNode) return;

    const bufferSize = this.ctx.sampleRate * 5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 400;

    // Changing wind
    const lfo = this.ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.2; // Slow wind
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 200;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    const gain = this.ctx.createGain();
    gain.gain.value = 0.035; // Keep wind present but below critical combat cues.

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ambientGain);
    noise.start();

    this.ambientNode = noise;
  }

  playImpact({ target = "world", weapon = "hitscan", intensity = 1.0 } = {}) {
    if (this.ctx.state === "suspended") this.ctx.resume();
    const t = this.ctx.currentTime;
    const gainScale = Math.max(0.25, Math.min(2.4, intensity));
    const shotgunScale = weapon === "shotgun" ? 1.15 : 1.0;

    if (target === "headshot") {
      // Headshot: sharp confirmation + deeper impact body.
      this.playTone(1680, "square", 0.05, 0.34 * gainScale, 0.01, t, this.uiGain);
      this.playTone(2240, "triangle", 0.04, 0.24 * gainScale, 0.01, t, this.uiGain);
      this.playTone(3080, "sine", 0.09, 0.3 * gainScale, 0.01, t + 0.012, this.uiGain);
      this.playNoise(t, 0.08, "bandpass", 1050, 0.32 * gainScale, 0.01, this.sfxGain);
      this.playTone(150, "sine", 0.08, 0.24 * gainScale, 0.01, t, this.sfxGain);
      return;
    }

    if (target === "enemy") {
      // Flesh/armor impact: mid punch + low body.
      this.playTone(170, "triangle", 0.08, 0.24 * gainScale, 0.01, t, this.sfxGain);
      this.playTone(280, "sine", 0.06, 0.18 * gainScale, 0.01, t + 0.01, this.sfxGain);
      this.playNoise(t, 0.07, "bandpass", 880, 0.3 * gainScale, 0.01, this.sfxGain);
      this.playTone(980, "square", 0.03, 0.08 * gainScale, 0.01, t, this.uiGain);
      return;
    }

    if (target === "splash") {
      // Splash/AOE hit body.
      this.playTone(95, "sine", 0.14, 0.34 * gainScale, 0.01, t, this.sfxGain);
      this.playNoise(t, 0.12, "bandpass", 760, 0.42 * gainScale, 0.01, this.sfxGain);
      this.playNoise(t + 0.02, 0.1, "highpass", 2300, 0.18 * gainScale, 0.01, this.sfxGain);
      return;
    }

    // World/metal impact: ricochet + debris tick.
    this.playTone(1120, "square", 0.03, 0.18 * gainScale * shotgunScale, 0.01, t, this.sfxGain);
    this.playTone(1760, "triangle", 0.04, 0.14 * gainScale, 0.01, t + 0.003, this.sfxGain);
    this.playNoise(t, 0.05, "highpass", 1900, 0.22 * gainScale, 0.01, this.sfxGain);
    this.playNoise(t + 0.018, 0.07, "bandpass", 940, 0.16 * gainScale, 0.01, this.sfxGain);
  }

  playHitSound(isHeadshot) {
    if (this.ctx.state === "suspended") this.ctx.resume();
    const t = this.ctx.currentTime;

    // High pitch "marker" sound
    const freq = isHeadshot ? 2200 : 1300;
    this.playTone(freq, "sine", 0.05, 0.34, 0.01, t, this.uiGain);
    this.playTone(freq * 1.35, "triangle", 0.04, 0.2, 0.01, t, this.uiGain);
    this.playTone(freq * 0.62, "square", 0.03, 0.11, 0.01, t, this.uiGain);

    if (isHeadshot) {
      // Satisfying "ding" for headshot with brighter tail.
      this.playTone(3200, "sine", 0.1, 0.42, 0.01, t, this.uiGain);
      this.playTone(4100, "sine", 0.12, 0.24, 0.01, t + 0.01, this.uiGain);
    }
  }

  playPickup() {
    if (this.ctx.state === "suspended") this.ctx.resume();
    const t = this.ctx.currentTime;

    // Ascending power-up sound
    this.playTone(400, "sine", 0.1, 0.4, 0.01, t, this.uiGain);
    this.playTone(600, "sine", 0.1, 0.3, 0.01, t + 0.05, this.uiGain);
    this.playTone(800, "sine", 0.15, 0.5, 0.01, t + 0.1, this.uiGain);
  }

  playSlide() {
    if (this.ctx.state === "suspended") this.ctx.resume();
    const t = this.ctx.currentTime;

    // Sliding/scraping sound
    this.playNoise(t, 0.3, "highpass", 1500, 0.4, 0.01);
    this.playTone(100, "triangle", 0.3, 0.3, 0.01, t);
  }
}
