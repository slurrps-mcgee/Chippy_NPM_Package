// cpu/Audio.ts
export class Audio {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private oscillator: OscillatorNode | null = null;

  private wave: OscillatorType = "square";
  private volumeLevel: number = 0.3;
  private soundEnabled: boolean = false;

  constructor() {
    this.initAudio();
  }

  /** Initialize audio context and gain node */
  private initAudio(): void {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      this.audioContext = new AudioCtx();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.value = this.volumeLevel;
    }
  }

  /** Ensure AudioContext is running */
  private async ensureAudioContext(): Promise<void> {
    if (this.audioContext && this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }
  }

  /** Enable sound playback */
  async enableSound(): Promise<void> {
    if (!this.audioContext) return;
    await this.ensureAudioContext();
    if (this.soundEnabled) return; // Only start if not already playing
    this.oscillator = new OscillatorNode(this.audioContext, { type: this.wave });
    this.oscillator.connect(this.masterGain!);
    this.oscillator.start();
    this.soundEnabled = true;
  }

  /** Disable sound playback */
  disableSound(): void {
    if (this.oscillator && this.soundEnabled) {
      this.oscillator.stop();
      this.oscillator.disconnect();
      this.oscillator = null;
      this.soundEnabled = false;
    }
  }

  /** Mute audio */
  mute(): void {
    this.volumeLevel = 0;
    if (this.masterGain) this.masterGain.gain.value = 0;
  }

  /** Unmute audio and set volume */
  unMute(value: number = 0.3): void {
    this.volumeLevel = value;
    if (this.masterGain) this.masterGain.gain.value = value;
  }

  /** Play sound if timer > 0 */
  async playSound(timerValue: number): Promise<void> {
    if (timerValue > 0) {
      await this.enableSound();
    } else {
      this.disableSound();
    }
  }

  // Properties to customize sound
  /** Set oscillator wave type */
  setWave(type: OscillatorType): void {
    this.wave = type;
    if (this.oscillator) this.oscillator.type = type;
  }

  /** Get current volume level */
  getVolume(): number {
    return this.volumeLevel;
  }

  /** Set master volume */
  setVolume(value: number): void {
    this.volumeLevel = value;
    if (this.masterGain) this.masterGain.gain.value = value;
  }
}
