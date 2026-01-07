// operations/execution-context.ts
import { Registers } from "@/cpu/registers/registers";
import { Memory } from "@/memory/memory";

/**
 * ExecutionContext provides the CPU with access to memory, registers,
 * display, input, and timers. It abstracts the underlying hardware
 * so that the CPU can operate independently.
 */
export interface ExecutionContext {
  /** CPU registers */
  registers: Registers;

  /** System memory */
  memory: Memory;

  /**
   * Draw a sprite at (x, y). Returns true if any pixels were flipped from set to unset (collision).
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param sprite - Uint8Array of sprite bytes
   */
  drawSprite(x: number, y: number, sprite: Uint8Array): boolean;

  /** Check if a key is currently pressed */
  isKeyPressed(key: number): boolean;

  /**
   * Wait for the next key press.
   * @param callback - called with the key value once pressed
   */
  waitForKeyPress(callback: (key: number) => void): void;

  /** Called each cycle to decrement delay and sound timers */
  decrementTimers(): void;
}
