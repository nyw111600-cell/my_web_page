// 8-bit Web Audio Synthesizer for Bubble Bobble Mini
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.bgmPlaying = false;
    this.bgmTimer = null;
    this.bgmStep = 0;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleSound() {
    this.enabled = !this.enabled;
    if (!this.enabled) {
      this.stopBGM();
    } else {
      this.startBGM();
    }
    return this.enabled;
  }

  // Play a simple synthesized tone
  playTone(freq, type = 'square', duration = 0.1, gainVal = 0.15) {
    if (!this.enabled || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {}
  }

  // Jump SFX
  playJump() {
    if (!this.enabled || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = 'square';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch (e) {}
  }

  // Bubble Shoot SFX
  playShoot() {
    if (!this.enabled || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(500, now + 0.15);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch (e) {}
  }

  // Bubble Pop SFX
  playPop() {
    if (!this.enabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      // High pitch click + drop
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.12);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {}
  }

  // Trap Monster SFX
  playTrap() {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.playTone(523.25, 'triangle', 0.08, 0.2); // C5
    setTimeout(() => this.playTone(659.25, 'triangle', 0.12, 0.2), 60); // E5
  }

  // Item Pickup SFX
  playItem() {
    if (!this.enabled || !this.ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 'square', 0.08, 0.15), i * 40);
    });
  }

  // Player Hurt SFX
  playHurt() {
    if (!this.enabled || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.linearRampToValueAtTime(70, now + 0.35);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {}
  }

  // Stage Clear Fanfare
  playStageClear() {
    if (!this.enabled || !this.ctx) return;
    const melody = [
      { f: 523.25, d: 0.12 }, // C5
      { f: 659.25, d: 0.12 }, // E5
      { f: 783.99, d: 0.12 }, // G5
      { f: 1046.5, d: 0.25 }, // C6
      { f: 880.00, d: 0.15 }, // A5
      { f: 1046.5, d: 0.40 }  // C6
    ];
    let time = 0;
    melody.forEach(item => {
      setTimeout(() => this.playTone(item.f, 'square', item.d, 0.18), time);
      time += item.d * 1000 + 30;
    });
  }

  // Game Over Sound
  playGameOver() {
    if (!this.enabled || !this.ctx) return;
    const melody = [
      { f: 440.00, d: 0.2 },
      { f: 415.30, d: 0.2 },
      { f: 392.00, d: 0.2 },
      { f: 349.23, d: 0.5 }
    ];
    let time = 0;
    melody.forEach(item => {
      setTimeout(() => this.playTone(item.f, 'sawtooth', item.d, 0.2), time);
      time += item.d * 1000 + 40;
    });
  }

  // 8-bit Chiptune Background Music Loop (Bubble Bobble inspired cheerful melody)
  startBGM() {
    if (!this.enabled || this.bgmPlaying || !this.ctx) return;
    this.bgmPlaying = true;
    this.bgmStep = 0;

    // Classic cheerful 8-bit melody sequence (Frequencies in Hz)
    const C4 = 261.63, D4 = 293.66, E4 = 329.63, F4 = 349.23, G4 = 392.00, A4 = 440.00, B4 = 493.88;
    const C5 = 523.25, D5 = 587.33, E5 = 659.25, F5 = 698.46, G5 = 783.99, A5 = 880.00;
    const R = 0; // Rest

    const notes = [
      C5, C5, G4, G4, A4, A4, G4, R,
      F4, F4, E4, E4, D4, D4, C4, R,
      G4, G4, F4, F4, E4, E4, D4, R,
      G4, G4, F4, F4, E4, E4, D4, R,
      C5, C5, G4, G4, A4, A4, G4, R,
      F4, F4, E4, E4, D4, D4, C4, R
    ];

    const bassNotes = [
      C4, G4, C4, G4, F4, C4, G4, D4,
      F4, C4, E4, B4, D4, A4, C4, G4,
      G4, D4, F4, C4, E4, B4, D4, G4,
      G4, D4, F4, C4, E4, B4, D4, G4,
      C4, G4, C4, G4, F4, C4, G4, D4,
      F4, C4, E4, B4, D4, A4, C4, G4
    ];

    const stepInterval = 160; // ms per 16th note

    const playNextStep = () => {
      if (!this.bgmPlaying || !this.enabled) return;

      const n = notes[this.bgmStep % notes.length];
      const b = bassNotes[this.bgmStep % bassNotes.length];

      if (n > 0) {
        this.playTone(n, 'square', 0.12, 0.05);
      }
      if (b > 0 && this.bgmStep % 2 === 0) {
        this.playTone(b / 2, 'triangle', 0.18, 0.08); // Bass note
      }

      this.bgmStep++;
      this.bgmTimer = setTimeout(playNextStep, stepInterval);
    };

    playNextStep();
  }

  stopBGM() {
    this.bgmPlaying = false;
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

window.soundEngine = new SoundEngine();
