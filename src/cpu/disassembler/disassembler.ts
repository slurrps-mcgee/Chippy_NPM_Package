import { INSTRUCTION_SET } from "@/constants/instructions.constants";

export type InstructionDef = (typeof INSTRUCTION_SET)[number];

export type DisassembleResult = {
  instruction: InstructionDef | null;
  args: number[];
};

/**
 * Disassembler converts a 16-bit opcode into a Chip8 instruction and its arguments.
 * Instructions are indexed by high nibble for O(1) group lookup, then matched
 * within the group (sorted by mask specificity descending).
 */
export class Disassembler {
  private static groups: Map<number, InstructionDef[]> | null = null;

  /** Rebuild lookup tables (call if INSTRUCTION_SET changes at runtime) */
  public static invalidateCache(): void {
    Disassembler.groups = null;
  }

  private static buildGroups(): Map<number, InstructionDef[]> {
    const groups = new Map<number, InstructionDef[]>();

    for (const instr of INSTRUCTION_SET) {
      // Most Chip-8 ops are distinguished by the high nibble (bits 12–15).
      // Exact-match ops (0xFFFF mask) still live under their high nibble.
      const nibble = (instr.pattern >> 12) & 0xf;
      const list = groups.get(nibble) ?? [];
      list.push(instr);
      groups.set(nibble, list);
    }

    // Prefer more-specific masks first so 00E0 / 00EE beat a broader 0xxx pattern
    for (const [, list] of groups) {
      list.sort((a, b) => Number(b.mask) - Number(a.mask) || a.pattern - b.pattern);
    }

    return groups;
  }

  private getGroups(): Map<number, InstructionDef[]> {
    if (!Disassembler.groups) {
      Disassembler.groups = Disassembler.buildGroups();
    }
    return Disassembler.groups;
  }

  /**
   * Disassemble a given opcode
   */
  public disassemble(opcode: number): DisassembleResult {
    const nibble = (opcode >> 12) & 0xf;
    const candidates = this.getGroups().get(nibble);

    if (!candidates) {
      return { instruction: null, args: [] };
    }

    const instruction = candidates.find(
      (instr) => (opcode & Number(instr.mask)) === instr.pattern
    );

    if (!instruction) {
      return { instruction: null, args: [] };
    }

    const args = instruction.arguments.map((arg: { mask: number; shift?: number }) => {
      const shift = arg.shift ?? 0;
      return (opcode & Number(arg.mask)) >> shift;
    });

    return { instruction, args };
  }
}
