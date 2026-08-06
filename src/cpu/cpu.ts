import { Registers } from "@/cpu/registers/registers";
import { Disassembler } from "@/cpu/disassembler/disassembler";
import { OPERATIONS } from "@/cpu/operations/operations";
import type { ExecutionContext } from "@/cpu/operations/executionContext";

export class CPU {
  registers = new Registers();
  private disassembler = new Disassembler();

  /**
   * Execute one CPU tick (instruction cycle).
   * Handles XO-CHIP double-wide `F000 NNNN` (i := long).
   */
  public tick(ctx: ExecutionContext): number {
    if (this.registers.paused) return 0;

    const opcode = ctx.memory.readOpcode(this.registers.PC);
    this.registers.nextInstruction();

    // XO-CHIP: i := long NNNN — consume the following word as a 16-bit immediate
    if (opcode === 0xf000) {
      this.registers.I = ctx.memory.readOpcode(this.registers.PC) & 0xffff;
      this.registers.nextInstruction();
      return 1;
    }

    const { instruction, args } = this.disassembler.disassemble(opcode);
    if (!instruction) {
      console.error(`Invalid opcode 0x${opcode.toString(16)}`);
      return 0;
    }

    const operation = OPERATIONS[instruction.id];
    if (!operation) {
      console.error(`Unimplemented instruction: ${instruction.id}`);
      return 0;
    }

    operation(ctx, args, opcode);
    this.registers.I &= 0xffff;
    this.registers.PC &= 0xffff;
    return 1;
  }

  public disassemble(opcode: number) {
    return this.disassembler.disassemble(opcode);
  }

  public reset(): void {
    this.registers.reset();
  }
}
