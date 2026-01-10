import { LOAD_PROGRAM_ADDRESS, MEMORY_SIZE } from "@/constants/memory.constants";
import { SPRITE_SET_ADDRESS, SPRITES } from "@/constants/sprite.constants";

export class Memory {
  // Main memory array
  private memory = new Uint8Array(MEMORY_SIZE);
  // Length of loaded ROM
  private romLength = 0;

  // Initialize memory and load font sprites
  constructor() {
    // Initialize memory
    this.reset();
  }

  // Read a byte from memory
  public read(address: number): number {
    this.assertMemory(address);
    return this.memory[address];
  }

  // Write a byte to memory
  public write(address: number, value: number): void {
    this.assertMemory(address);
    this.memory[address] = value & 0xff;
  }

  // Slice a portion of memory
  public slice(start: number, end: number): Uint8Array {
    return this.memory.slice(start, end);
  }

  // Read a 2-byte opcode from memory
  public readOpcode(address: number): number {
    // Guard: only read opcode if within ROM bounds
    if (!this.isAddressInROM(address)) {
      console.warn(`PC 0x${address.toString(16)} out of ROM bounds, returning 0x0000`);
      return 0x0000;
    }
    return (this.read(address) << 8) | this.read(address + 1);
  }

  public reset(): void {
    // Clear memory and load font sprites
    this.memory.fill(0);
    this.memory.set(SPRITES, SPRITE_SET_ADDRESS);
  }

  // Load ROM data into memory starting at LOAD_PROGRAM_ADDRESS
  public loadROM(buffer: Uint8Array): void {
    // Guard: check ROM size against memory capacity
    if (buffer.length + LOAD_PROGRAM_ADDRESS > MEMORY_SIZE) {
      throw new Error("ROM size exceeds memory capacity");
    }

    this.memory.set(buffer, LOAD_PROGRAM_ADDRESS);

    this.romLength = buffer.length;
  }

  // Check if address is within loaded ROM bounds
  public isAddressInROM(address: number): boolean {
    return address >= LOAD_PROGRAM_ADDRESS && address < LOAD_PROGRAM_ADDRESS + this.romLength;
  }

  // Validate memory access
  private assertMemory(address: number) {
    if (address < 0 || address >= MEMORY_SIZE) {
      throw new Error(
        `Memory access out of bounds at 0x${address.toString(16)}`
      );
    }
  }
}

// singleton hardware module
export const memory = new Memory();
