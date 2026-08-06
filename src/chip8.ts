import { CPU } from "@/cpu/cpu";
import { Display } from "@/display/display";
import { Memory } from "@/memory/memory";
import { Audio } from "@/audio/audio";
import { Keyboard } from "@/input/keyboard";
import { CHIP8_SPEED, CHIP8_TIMER_HZ } from "@/constants/cpu.constants";
import type { ExecutionContext } from "@/cpu/operations/executionContext";
import type { Registers } from "@/cpu/registers/registers";
import type { DisassembleResult } from "@/cpu/disassembler/disassembler";

export type FrameFinishedCallback = (
  frameBuffer: ImageData,
  fps: number,
  registers: Registers
) => void;

/**
 * Chip-8 / SUPER-CHIP / XO-CHIP emulator facade.
 */
export class Chip8 {
  cpu: CPU;
  display: Display;
  keyboard: Keyboard;
  speaker: Audio;
  private memory: Memory;

  /** XO/SCHIP flag registers (16 bytes) */
  private rplFlags = new Uint8Array(16);

  /**
   * When true, lores SCD/SCR/SCL/SCU use legacy HP-48 half-pixel amounts.
   * Default false = modern SCHIP / XO-CHIP (Timendus scrolling test options 1,3,4,5).
   */
  private legacyHalfPixelScrollQuirk = false;

  private ctx: ExecutionContext;
  private frameFinishedCallback?: FrameFinishedCallback;

  private fps = 0;
  private maxFps = CHIP8_TIMER_HZ;
  private interval = 1000 / this.maxFps;
  private previousTime = 0;

  private targetIps = CHIP8_SPEED;
  private instructionAccumulator = 0;
  private lastSoundTimer = 0;

  private rafId: number | null = null;
  private running = false;
  private paused = false;

  constructor() {
    this.display = new Display();
    this.keyboard = new Keyboard();
    this.speaker = new Audio();
    this.cpu = new CPU();
    this.memory = new Memory();

    this.ctx = {
      registers: this.cpu.registers,
      memory: this.memory,
      drawSprite: (x, y, sprite, rows) => this.display.drawSprite(x, y, sprite, rows),
      drawSprite16: (x, y, sprite) => this.display.drawSprite16(x, y, sprite),
      clearScreen: () => this.display.clear(),
      isExtended: () => this.display.extended,
      setExtended: (enabled) => this.display.setExtended(enabled),
      setPlaneMask: (mask) => this.display.setPlaneMask(mask),
      getPlaneMask: () => this.display.planeMask,
      legacyHalfPixelScroll: () => this.legacyHalfPixelScrollQuirk,
      scrollDown: (n) => this.display.scrollDown(n),
      scrollUp: (n) => this.display.scrollUp(n),
      scrollRight: (pixels) => this.display.scrollRight(pixels),
      scrollLeft: (pixels) => this.display.scrollLeft(pixels),
      saveFlags: (x) => this.saveFlags(x),
      loadFlags: (x) => this.loadFlags(x),
      loadAudioPattern: () => {
        const bytes = this.memory.slice(this.cpu.registers.I, this.cpu.registers.I + 16);
        this.speaker.loadPattern(bytes);
      },
      setPitch: (value) => this.speaker.setPitch(value),
      exit: () => this.stop(),
      skipNext: () => {
        const next = this.memory.readOpcode(this.cpu.registers.PC);
        this.cpu.registers.PC = (this.cpu.registers.PC + (next === 0xf000 ? 4 : 2)) & 0xffff;
      },
      isKeyPressed: (key) => this.keyboard.isKeyPressed(key),
      waitForKeyPress: (callback) => this.keyboard.waitForNextKeyPress(callback),
    };
  }

  run() {
    if (this.rafId !== null) return;
    this.running = true;
    this.paused = false;
    this.previousTime = 0;
    this.instructionAccumulator = 0;
    this.rafId = requestAnimationFrame((time) => this.runFrame(time));
  }

  pause() {
    this.paused = true;
  }

  resume() {
    if (!this.running) {
      this.run();
      return;
    }
    this.paused = false;
    this.previousTime = 0;
    this.instructionAccumulator = 0;
  }

  stop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.running = false;
    this.paused = false;
    this.speaker.disableSound();
  }

  step() {
    this.cpu.tick(this.ctx);
    void this.speaker.playSound(this.cpu.registers.ST);
    this.lastSoundTimer = this.cpu.registers.ST;
    this.fireFrameCallback();
  }

  reset() {
    const hadRom = this.memory.reloadLastRom();
    this.cpu.reset();
    this.display.setPlaneMask(0b01);
    this.display.setExtended(false);
    this.display.clearAll();
    this.keyboard.reset();
    this.speaker.resetAudioState();
    this.lastSoundTimer = 0;
    this.instructionAccumulator = 0;
    if (!hadRom) {
      this.memory.reset();
    }
    this.fireFrameCallback();
  }

  loadRom(romBuffer: Uint8Array) {
    this.memory.loadROM(romBuffer);
    this.cpu.reset();
    this.display.setPlaneMask(0b01);
    this.display.setExtended(false);
    this.display.clearAll();
    this.keyboard.reset();
    this.speaker.resetAudioState();
    this.lastSoundTimer = 0;
    this.instructionAccumulator = 0;
  }

  onFrameFinished(callback: FrameFinishedCallback) {
    this.frameFinishedCallback = callback;
  }

  getMemory(): Memory {
    return this.memory;
  }

  getRplFlags(): Uint8Array {
    return this.rplFlags.slice();
  }

  disassemble(opcode: number): DisassembleResult {
    return this.cpu.disassemble(opcode);
  }

  setTargetIps(ips: number) {
    this.targetIps = Math.max(1, ips);
  }

  getTargetIps(): number {
    return this.targetIps;
  }

  setCyclesPerFrame(n: number) {
    this.setTargetIps(Math.max(1, n) * CHIP8_TIMER_HZ);
  }

  getCyclesPerFrame(): number {
    return Math.round(this.targetIps / CHIP8_TIMER_HZ);
  }

  getFps(): number {
    return this.fps;
  }

  isRunning(): boolean {
    return this.running;
  }

  isPaused(): boolean {
    return this.paused;
  }

  isExtended(): boolean {
    return this.display.extended;
  }

  getPlaneMask(): number {
    return this.display.planeMask;
  }

  /**
   * Enable legacy HP-48 SUPER-CHIP lores half-pixel scrolling (Timendus option 2).
   * Leave off for modern SCHIP and XO-CHIP.
   */
  setLegacyHalfPixelScroll(enabled: boolean) {
    this.legacyHalfPixelScrollQuirk = enabled;
  }

  getLegacyHalfPixelScroll(): boolean {
    return this.legacyHalfPixelScrollQuirk;
  }

  private saveFlags(x: number) {
    const last = Math.min(x, 15);
    for (let i = 0; i <= last; i++) {
      this.rplFlags[i] = this.cpu.registers.V[i];
    }
  }

  private loadFlags(x: number) {
    const last = Math.min(x, 15);
    for (let i = 0; i <= last; i++) {
      this.cpu.registers.V[i] = this.rplFlags[i];
    }
  }

  private fireFrameCallback() {
    if (this.frameFinishedCallback) {
      this.frameFinishedCallback(this.display.frameBuffer, this.fps, this.cpu.registers);
    }
  }

  private runFrame(currentTime: number) {
    this.rafId = requestAnimationFrame((time) => this.runFrame(time));

    if (!this.previousTime) this.previousTime = currentTime;
    const delta = currentTime - this.previousTime;

    if (delta < this.interval) return;

    this.fps = 1000 / delta;
    this.previousTime = currentTime - (delta % this.interval);

    this.cpu.registers.updateTimers();

    const st = this.cpu.registers.ST;
    if (st !== this.lastSoundTimer) {
      void this.speaker.playSound(st);
      this.lastSoundTimer = st;
    }

    if (!this.paused) {
      const elapsedSec = Math.min(delta, 100) / 1000;
      this.instructionAccumulator += this.targetIps * elapsedSec;
      const cycles = Math.floor(this.instructionAccumulator);
      this.instructionAccumulator -= cycles;

      for (let i = 0; i < cycles; i++) {
        if (this.cpu.tick(this.ctx) === 0 && this.cpu.registers.paused) break;
        if (!this.running) break;
      }
    }

    if (this.running) {
      this.fireFrameCallback();
    }
  }
}
