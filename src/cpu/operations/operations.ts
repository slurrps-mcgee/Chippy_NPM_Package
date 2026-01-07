// operations/operations.ts
import type { ExecutionContext } from "@/cpu/operations/executionContext";

type Operation = (ctx: ExecutionContext, args: number[], opcode: number) => void;

export const OPERATIONS: Record<string, Operation> = {
  // 00E0 - Clear screen
  CLS(ctx) {
    ctx.drawSprite(0, 0, new Uint8Array()); // signal clear
  },

  // 00EE - Return from subroutine
  RET(ctx) {
    ctx.registers.PC = ctx.registers.stackPop();
  },

  // 1NNN - Jump
  JP_ADDR(ctx, [addr]) {
    ctx.registers.PC = addr;
  },

  // 2NNN - Call subroutine
  CALL_ADDR(ctx, [addr]) {
    ctx.registers.stackPush(ctx.registers.PC);
    ctx.registers.PC = addr;
  },

  // 3XKK - Skip next if equal
  SE_VX_KK(ctx, [x, kk]) {
    if (ctx.registers.V[x] === kk) ctx.registers.nextInstruction();
  },

  // 4XKK - Skip next if not equal
  SNE_VX_KK(ctx, [x, kk]) {
    if (ctx.registers.V[x] !== kk) ctx.registers.nextInstruction();
  },

  // 5XY0 - Skip if VX == VY
  SE_VX_VY(ctx, [x, y]) {
    if (ctx.registers.V[x] === ctx.registers.V[y]) ctx.registers.nextInstruction();
  },

  // 6XKK - Load constant into VX
  LD_VX_KK(ctx, [x, kk]) {
    ctx.registers.V[x] = kk;
  },

  // 7XKK - Add constant to VX
  ADD_VX_KK(ctx, [x, kk]) {
    ctx.registers.V[x] += kk;
  },

  // 8XY0 - Load VY into VX
  LD_VX_VY(ctx, [x, y]) {
    ctx.registers.V[x] = ctx.registers.V[y];
  },

  // 8XY1 - VX |= VY
  OR_VX_VY(ctx, [x, y]) {
    ctx.registers.V[x] |= ctx.registers.V[y];
  },

  // 8XY2 - VX &= VY
  AND_VX_VY(ctx, [x, y]) {
    ctx.registers.V[x] &= ctx.registers.V[y];
  },

  // 8XY3 - VX ^= VY
  XOR_VX_VY(ctx, [x, y]) {
    ctx.registers.V[x] ^= ctx.registers.V[y];
  },

  // 8XY4 - VX += VY with carry
  ADD_VX_VY(ctx, [x, y]) {
    const sum = ctx.registers.V[x] + ctx.registers.V[y];
    ctx.registers.V[0xf] = sum > 0xff ? 1 : 0;
    ctx.registers.V[x] = sum & 0xff;
  },

  // 8XY5 - VX -= VY with borrow
  SUB_VX_VY(ctx, [x, y]) {
    ctx.registers.V[0xf] = ctx.registers.V[x] >= ctx.registers.V[y] ? 1 : 0;
    ctx.registers.V[x] = (ctx.registers.V[x] - ctx.registers.V[y]) & 0xff;
  },

  // 8XY6 - Shift VX right by 1
  SHR_VX_VY(ctx, [x]) {
    ctx.registers.V[0xf] = ctx.registers.V[x] & 1;
    ctx.registers.V[x] >>= 1;
  },

  // 8XY7 - VX = VY - VX
  SUBN_VX_VY(ctx, [x, y]) {
    ctx.registers.V[0xf] = ctx.registers.V[y] >= ctx.registers.V[x] ? 1 : 0;
    ctx.registers.V[x] = (ctx.registers.V[y] - ctx.registers.V[x]) & 0xff;
  },

  // 8XYE - Shift VX left by 1
  SHL_VX_VY(ctx, [x]) {
    ctx.registers.V[0xf] = (ctx.registers.V[x] & 0x80) >> 7;
    ctx.registers.V[x] <<= 1;
    ctx.registers.V[x] &= 0xff;
  },

  // 9XY0 - Skip if VX != VY
  SNE_VX_VY(ctx, [x, y]) {
    if (ctx.registers.V[x] !== ctx.registers.V[y]) ctx.registers.nextInstruction();
  },

  // ANNN - Load address into I
  LD_I_ADDR(ctx, [addr]) {
    ctx.registers.I = addr;
  },

  // BNNN - Jump to V0 + addr
  JP_V0_ADDR(ctx, [addr]) {
    ctx.registers.PC = addr + ctx.registers.V[0];
  },

  // CXKK - VX = random & KK
  RND_VX_KK(ctx, [x], opcode) {
    const rand = Math.floor(Math.random() * 0xff);
    ctx.registers.V[x] = rand & (opcode & 0xff);
  },

  // DXYN - Draw sprite
  DRW_VX_VY_N(ctx, [x, y], opcode) {
    const height = opcode & 0xf;
    const sprite = ctx.memory.slice(ctx.registers.I, ctx.registers.I + height);
    const collision = ctx.drawSprite(ctx.registers.V[x], ctx.registers.V[y], sprite);
    ctx.registers.V[0xf] = collision ? 1 : 0;
  },

  // EX9E - Skip if key pressed
  SKP_VX(ctx, [x]) {
    if (ctx.isKeyPressed(ctx.registers.V[x])) ctx.registers.nextInstruction();
  },

  // EXA1 - Skip if key not pressed
  SKNP_VX(ctx, [x]) {
    if (!ctx.isKeyPressed(ctx.registers.V[x])) ctx.registers.nextInstruction();
  },

  // FX07 - Load delay timer into VX
  LD_VX_DT(ctx, [x]) {
    ctx.registers.V[x] = ctx.registers.DT;
  },

  // FX0A - Wait for key press
  LD_VX_K(ctx, [x]) {
    ctx.registers.paused = true;
    ctx.waitForKeyPress((key) => {
      ctx.registers.V[x] = key;
      ctx.registers.paused = false;
    });
  },

  // FX15 - Set delay timer
  LD_DT_VX(ctx, [x]) {
    ctx.registers.DT = ctx.registers.V[x];
  },

  // FX18 - Set sound timer
  LD_ST_VX(ctx, [x]) {
    ctx.registers.ST = ctx.registers.V[x];
  },

  // FX1E - Add VX to I
  ADD_I_VX(ctx, [x]) {
    ctx.registers.I += ctx.registers.V[x];
  },

  // FX29 - Set I to sprite location for VX
  LD_F_VX(ctx, [x]) {
    ctx.registers.I = ctx.registers.V[x] * 5;
  },

  // FX33 - Store BCD representation of VX at I
  LD_B_VX(ctx, [x]) {
    const value = ctx.registers.V[x];
    ctx.memory.write(ctx.registers.I, Math.floor(value / 100));
    ctx.memory.write(ctx.registers.I + 1, Math.floor((value % 100) / 10));
    ctx.memory.write(ctx.registers.I + 2, value % 10);
  },

  // FX55 - Store V0..VX in memory starting at I
  LD_I_VX(ctx, [x]) {
    for (let i = 0; i <= x; i++) {
      ctx.memory.write(ctx.registers.I + i, ctx.registers.V[i]);
    }
  },

  // FX65 - Read V0..VX from memory starting at I
  LD_VX_I(ctx, [x]) {
    for (let i = 0; i <= x; i++) {
      ctx.registers.V[i] = ctx.memory.read(ctx.registers.I + i);
    }
  },
};
