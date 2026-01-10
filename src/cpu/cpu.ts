// cpu/cpu.ts
import { Registers } from "@/cpu/registers/registers";
import { Disassembler } from "@/cpu/disassembler/disassembler";
import { OPERATIONS } from "@/cpu/operations/operations";
import type { ExecutionContext } from "@/cpu/operations/executionContext";

export class CPU {
  registers = new Registers();
  private disassembler = new Disassembler();

  /**
   * Execute one CPU tick (instruction cycle)
   * @param ctx The execution context (memory, registers, I/O)
   * @returns Number of instructions executed (1 per tick)
   */
  public tick(ctx: ExecutionContext): number {
    if (this.registers.paused) return 0;

    // Fetch opcode (2 bytes)
    const opcode = ctx.memory.readOpcode(this.registers.PC);

    // Move to next instruction by default
    this.registers.nextInstruction();

    // Disassemble
    const { instruction, args } = this.disassembler.disassemble(opcode);
    if (!instruction) {
      console.error(`Invalid opcode 0x${opcode.toString(16)}`);
      return 0;
    }

    // Execute
    const operation = OPERATIONS[instruction.id];
    if (!operation) {
      console.error(`Unimplemented instruction: ${instruction.id}`);
      return 0;
    }

    operation(ctx, args, opcode);

    // Update timers via context
    ctx.decrementTimers();

    return 1; // 1 instruction executed
  }

  /**
   * Reset CPU registers
   */
  public reset(): void {
    this.registers.reset();
  }
}
