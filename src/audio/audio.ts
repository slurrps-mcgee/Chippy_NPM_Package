/**
 * XO-CHIP pattern audio + classic CHIP-8 beep fallback.
 * Plays a looping 128-bit pattern at pitch-derived sample rate while ST > 0.
 */
export class Audio {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private processor: ScriptProcessorNode | null = null;

  private volumeLevel = 0.3;
  private muted = false;
  private soundEnabled = false;

  /** 16-byte XO pattern buffer (128 one-bit samples) */
  private pattern = new Uint8Array(16);
  /** Pitch register; rate = 4000 * 2^((pitch-64)/48) Hz */
  private pitch = 64;
  private phase = 0;
  private patternLoaded = false;

  constructor() {
    this.initDefaultPattern();
    this.initAudio();
  }

  private initDefaultPattern() {
    // Classic-friendly square so CHIP-8 games still beep before F002
    for (let i = 0; i < 16; i++) {
      this.pattern[i] = i % 2 === 0 ? 0xff : 0x00;
    }
  }

  private initAudio(): void {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.audioContext = new AudioCtx();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = this.volumeLevel;
    this.masterGain.connect(this.audioContext.destination);

    // ScriptProcessor is deprecated but portable without a separate worklet file
    this.processor = this.audioContext.createScriptProcessor(512, 0, 1);
    this.processor.onaudioprocess = (event) => this.fillAudio(event);
    this.processor.connect(this.masterGain);
  }

  private playbackRateHz(): number {
    return 4000 * Math.pow(2, (this.pitch - 64) / 48);
  }

  private fillAudio(event: AudioProcessingEvent) {
    const out = event.outputBuffer.getChannelData(0);
    if (!this.soundEnabled || !this.audioContext) {
      out.fill(0);
      return;
    }

    const increment = this.playbackRateHz() / this.audioContext.sampleRate;
    for (let i = 0; i < out.length; i++) {
      const bitIndex = Math.floor(this.phase) & 127;
      const byte = this.pattern[bitIndex >> 3];
      const bit = (byte >> (7 - (bitIndex & 7))) & 1;
      out[i] = bit ? 1 : -1;
      this.phase += increment;
      if (this.phase >= 128) this.phase -= 128;
    }
  }

  private async ensureAudioContext(): Promise<void> {
    if (this.audioContext && this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }
  }

  async unlock(): Promise<void> {
    if (!this.audioContext) return;
    await this.ensureAudioContext();
  }

  async enableSound(): Promise<void> {
    if (!this.audioContext) return;
    await this.unlock();
    this.soundEnabled = true;
  }

  disableSound(): void {
    this.soundEnabled = false;
  }

  mute(): void {
    this.muted = true;
    if (this.masterGain) this.masterGain.gain.value = 0;
  }

  unMute(value: number = this.volumeLevel): void {
    this.muted = false;
    this.volumeLevel = value;
    if (this.masterGain) this.masterGain.gain.value = value;
  }

  /**
   * Gate pattern playback from the sound timer.
   * Phase resets only when the timer hits zero (XO continuous tone).
   */
  async playSound(timerValue: number): Promise<void> {
    if (timerValue > 0) {
      await this.enableSound();
    } else {
      await this.unlock();
      if (this.soundEnabled) {
        this.disableSound();
        this.phase = 0;
      }
    }
  }

  /** Copy 16 bytes into the XO pattern buffer */
  loadPattern(bytes: Uint8Array): void {
    this.pattern.set(bytes.subarray(0, 16));
    this.patternLoaded = true;
  }

  /** Set pitch register (0–255); updates playback rate */
  setPitch(value: number): void {
    this.pitch = value & 0xff;
  }

  getPitch(): number {
    return this.pitch;
  }

  getPattern(): Uint8Array {
    return this.pattern.slice();
  }

  /** Kept for demo API compatibility — pattern audio ignores oscillator type */
  setWave(_type: OscillatorType): void {
    // no-op under XO pattern audio
  }

  getVolume(): number {
    return this.volumeLevel;
  }

  isMuted(): boolean {
    return this.muted;
  }

  setVolume(value: number): void {
    this.volumeLevel = value;
    if (this.masterGain && !this.muted) {
      this.masterGain.gain.value = value;
    }
  }

  /** True after an explicit F002 audio load */
  hasCustomPattern(): boolean {
    return this.patternLoaded;
  }

  resetAudioState(): void {
    this.initDefaultPattern();
    this.patternLoaded = false;
    this.pitch = 64;
    this.phase = 0;
    this.disableSound();
  }
}
