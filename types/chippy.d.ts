/**
 * Public TypeScript declarations for @slurrps/chippy.
 * Bundled JS resolves all internals; this file documents the stable consumer API.
 */

export type FrameFinishedCallback = (
  frameBuffer: ImageData,
  fps: number,
  registers: Registers
) => void;

export interface DisassembleResult {
  instruction: { id: string; name: string; key: number } | null;
  args: number[];
}

export interface Registers {
  V: Uint8Array;
  I: number;
  stack: Uint16Array;
  SP: number;
  PC: number;
  DT: number;
  ST: number;
  paused: boolean;
  reset(): void;
  nextInstruction(): void;
  stackPush(value: number): void;
  stackPop(): number;
  updateTimers(): boolean;
}

export interface Memory {
  read(address: number): number;
  write(address: number, value: number): void;
  slice(start: number, end: number): Uint8Array;
  readOpcode(address: number): number;
  reset(): void;
  loadROM(buffer: Uint8Array): void;
  reloadLastRom(): boolean;
  getRomLength(): number;
  isAddressInROM(address: number): boolean;
  getSize(): number;
}

export interface DrawSpriteResult {
  collision: boolean;
  collisionRows: number;
}

export interface Display {
  width: number;
  height: number;
  frameBuffer: ImageData;
  extended: boolean;
  planeMask: number;
  /** VIP-style wrap; leave false for SCHIP/XO clipping (Timendus default) */
  spriteWrap: boolean;
  clear(): void;
  clearAll(): void;
  setExtended(enabled: boolean): void;
  setPlaneMask(mask: number): void;
  drawSprite(x: number, y: number, sprite: Uint8Array, rows: number): DrawSpriteResult;
  drawSprite16(x: number, y: number, sprite: Uint8Array): DrawSpriteResult;
  scrollDown(n: number): void;
  scrollUp(n: number): void;
  scrollRight(pixels: number): void;
  scrollLeft(pixels: number): void;
  setForegroundColor(color: string | [number, number, number]): void;
  setBackgroundColor(color: string | [number, number, number]): void;
  setPlane0Color(color: string | [number, number, number]): void;
  setPlane1Color(color: string | [number, number, number]): void;
  setOverlapColor(color: string | [number, number, number]): void;
  getPixel(x: number, y: number): number;
}

export interface Audio {
  unlock(): Promise<void>;
  enableSound(): Promise<void>;
  disableSound(): void;
  mute(): void;
  unMute(value?: number): void;
  playSound(timerValue: number): Promise<void>;
  loadPattern(bytes: Uint8Array): void;
  setPitch(value: number): void;
  getPitch(): number;
  getPattern(): Uint8Array;
  setWave(type: OscillatorType): void;
  getVolume(): number;
  isMuted(): boolean;
  setVolume(value: number): void;
  hasCustomPattern(): boolean;
  resetAudioState(): void;
}

export interface Keyboard {
  keyPressed: boolean[];
  onNextKeyPress: ((key: number) => void) | null;
  readonly DigitalKeyMapping: Record<string, number>;
  isKeyPressed(keyCode: number): boolean;
  triggerKeyEvent(chip8Key: number, eventType: string): void;
  waitForNextKeyPress(callback: (key: number) => void): void;
  reset(): void;
}

export interface CPU {
  registers: Registers;
  tick(ctx: unknown): number;
  disassemble(opcode: number): DisassembleResult;
  reset(): void;
}

export declare class Chip8 {
  cpu: CPU;
  display: Display;
  keyboard: Keyboard;
  speaker: Audio;

  constructor();

  run(): void;
  pause(): void;
  resume(): void;
  stop(): void;
  step(): void;
  reset(): void;
  loadRom(romBuffer: Uint8Array): void;
  onFrameFinished(callback: FrameFinishedCallback): void;
  getMemory(): Memory;
  getRplFlags(): Uint8Array;
  disassemble(opcode: number): DisassembleResult;
  setTargetIps(ips: number): void;
  getTargetIps(): number;
  setCyclesPerFrame(n: number): void;
  getCyclesPerFrame(): number;
  getFps(): number;
  isRunning(): boolean;
  isPaused(): boolean;
  isExtended(): boolean;
  getPlaneMask(): number;
  setLegacyHalfPixelScroll(enabled: boolean): void;
  getLegacyHalfPixelScroll(): boolean;
}
