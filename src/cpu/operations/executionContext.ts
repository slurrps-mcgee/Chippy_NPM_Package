import type { Registers } from "@/cpu/registers/registers";
import type { Memory } from "@/memory/memory";
import type { DrawSpriteResult } from "@/display/display";

/**
 * ExecutionContext — CHIP-8 / SUPER-CHIP / XO-CHIP hardware bridge.
 */
export interface ExecutionContext {
  registers: Registers;
  memory: Memory;

  drawSprite(x: number, y: number, sprite: Uint8Array, rows: number): DrawSpriteResult;
  drawSprite16(x: number, y: number, sprite: Uint8Array): DrawSpriteResult;
  clearScreen(): void;

  isExtended(): boolean;
  setExtended(enabled: boolean): void;
  setPlaneMask(mask: number): void;
  getPlaneMask(): number;

  /**
   * Legacy HP-48 SUPER-CHIP lores: scroll by half-pixels (physical pixels on a
   * 2×2 display). Modern SCHIP / XO-CHIP leave this false.
   */
  legacyHalfPixelScroll(): boolean;

  scrollDown(n: number): void;
  scrollUp(n: number): void;
  scrollRight(pixels: number): void;
  scrollLeft(pixels: number): void;

  saveFlags(x: number): void;
  loadFlags(x: number): void;

  /** Load XO audio pattern (16 bytes from I) */
  loadAudioPattern(): void;
  /** Set XO pitch from a register value */
  setPitch(value: number): void;

  exit(): void;

  /**
   * Skip the next instruction, advancing 4 bytes when the next opcode is
   * the XO double-wide `F000` immediate.
   */
  skipNext(): void;

  isKeyPressed(key: number): boolean;
  waitForKeyPress(callback: (key: number) => void): void;
}
