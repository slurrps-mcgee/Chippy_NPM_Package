import { LOAD_PROGRAM_ADDRESS, MEMORY_SIZE } from "@/constants/memory.constants";
import {
  LARGE_SPRITE_SET_ADDRESS,
  LARGE_SPRITES,
  SPRITE_SET_ADDRESS,
  SPRITES,
} from "@/constants/sprite.constants";

export class Memory {
  private memory = new Uint8Array(MEMORY_SIZE);
  private romLength = 0;
  private lastRom: Uint8Array | null = null;

  constructor() {
    this.reset();
  }

  public read(address: number): number {
    return this.memory[address & 0xffff];
  }

  public write(address: number, value: number): void {
    this.memory[address & 0xffff] = value & 0xff;
  }

  public slice(start: number, end: number): Uint8Array {
    const s = start & 0xffff;
    const e = end & 0xffff;
    if (e >= s) return this.memory.slice(s, e);
    // Rare wrap across end of address space
    const first = this.memory.slice(s);
    const second = this.memory.slice(0, e);
    const out = new Uint8Array(first.length + second.length);
    out.set(first);
    out.set(second, first.length);
    return out;
  }

  public readOpcode(address: number): number {
    const a = address & 0xffff;
    return (this.memory[a] << 8) | this.memory[(a + 1) & 0xffff];
  }

  public reset(): void {
    this.memory.fill(0);
    this.memory.set(SPRITES, SPRITE_SET_ADDRESS);
    this.memory.set(LARGE_SPRITES, LARGE_SPRITE_SET_ADDRESS);
    this.romLength = 0;
  }

  public loadROM(buffer: Uint8Array): void {
    if (buffer.length + LOAD_PROGRAM_ADDRESS > MEMORY_SIZE) {
      throw new Error("ROM size exceeds memory capacity");
    }

    this.reset();
    this.memory.set(buffer, LOAD_PROGRAM_ADDRESS);
    this.romLength = buffer.length;
    this.lastRom = buffer.slice();
  }

  public reloadLastRom(): boolean {
    if (!this.lastRom) return false;
    this.loadROM(this.lastRom);
    return true;
  }

  public getRomLength(): number {
    return this.romLength;
  }

  public isAddressInROM(address: number): boolean {
    const a = address & 0xffff;
    return a >= LOAD_PROGRAM_ADDRESS && a < LOAD_PROGRAM_ADDRESS + this.romLength;
  }

  public getSize(): number {
    return MEMORY_SIZE;
  }
}
