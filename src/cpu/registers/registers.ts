// cpu/registers.ts
import {NUMBER_OF_REGISTERS, STACK_DEEP } from "@/constants/registers.constants";
import { LOAD_PROGRAM_ADDRESS } from "@/constants/memory.constants";

export class Registers {
  // General-purpose registers V0-VF
  public V: Uint8Array = new Uint8Array(NUMBER_OF_REGISTERS);

  // Memory address register
  public I: number = 0;

  // Stack
  public stack: Uint16Array = new Uint16Array(STACK_DEEP);
  public SP: number = -1; // Stack pointer
  // Program Counter
  public PC: number = LOAD_PROGRAM_ADDRESS;

  // Timers
  public DT: number = 0; // Delay Timer
  public ST: number = 0; // Sound Timer
  // Pause flag (for waiting for keypress)
  public paused: boolean = false;

  constructor() {
    this.reset();
  }

  /** Reset all registers, stack, PC, timers, and pause flag */
  public reset(): void {
    this.V.fill(0);
    this.I = 0;
    this.stack.fill(0);
    this.SP = -1;
    this.PC = LOAD_PROGRAM_ADDRESS;
    this.DT = 0;
    this.ST = 0;
    this.paused = false;
  }

  /** Increment program counter to next instruction (2 bytes per CHIP-8 instruction) */
  public nextInstruction(): void {
    this.PC += 2;
  }

  /** Push value onto stack */
  public stackPush(value: number): void {
    if (this.SP >= STACK_DEEP - 1) {
      throw new Error("Stack Overflow: Attempted to push beyond stack depth.");
    }
    this.SP++;
    this.stack[this.SP] = value;
  }

  /** Pop value from stack */
  public stackPop(): number {
    if (this.SP < 0) {
      throw new Error("Stack Underflow: Attempted to pop from an empty stack.");
    }
    const value = this.stack[this.SP];
    this.SP--;
    return value;
  }

  /**
   * Update timers (called each cycle at ~60Hz)
   * Decrements DT and ST, returns true if ST reached 0 (useful for beeps)
   */
  public updateTimers(): boolean {
    if (this.DT > 0) this.DT--;
    if (this.ST > 0) {
      this.ST--;
      return this.ST === 0;
    }
    return false;
  }
}
