import { INSTRUCTION_SET } from "@/constants/instructions.constants";

/**
 * Disassembler converts a 16-bit opcode into a Chip8 instruction and its arguments.
 */
export class Disassembler {
  /**
   * Disassemble a given opcode
   * @param opcode 16-bit opcode
   * @returns { instruction: Instruction | null, args: number[] }
   */
  disassemble(opcode: number): { instruction: any | null; args: number[] } {
    try {
      // Find the instruction that matches the given opcode
      const instruction = INSTRUCTION_SET.find(
        (instr) => (opcode & Number(instr.mask)) === instr.pattern
      );

      // If no instruction matches, return null
      if (!instruction) {
        console.error(`Opcode not found: 0x${opcode.toString(16)}`);
        return { instruction: null, args: [] };
      }

      // Extract arguments based on instruction definition
      const args = instruction.arguments.map((arg: { mask: number; shift?: number }) => {
        const shift = arg.shift ?? 0;
        return (opcode & Number(arg.mask)) >> shift;
      });

      // Return the matched instruction and its arguments
      return { instruction, args };
    } catch (error) {
      console.error(`Error disassembling opcode: 0x${opcode.toString(16)}`, error);
      return { instruction: null, args: [] };
    }
  }
}
