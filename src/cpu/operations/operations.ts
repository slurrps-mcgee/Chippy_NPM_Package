import type { ExecutionContext } from "@/cpu/operations/executionContext";
import { LARGE_SPRITE_SET_ADDRESS, SPRITE_SET_ADDRESS } from "@/constants/sprite.constants";

type Operation = (ctx: ExecutionContext, args: number[], opcode: number) => void;

function rangeStep(from: number, to: number): number {
  return from <= to ? 1 : -1;
}

export const OPERATIONS: Record<string, Operation> = {
  CLS(ctx) {
    ctx.clearScreen();
  },

  RET(ctx) {
    ctx.registers.PC = ctx.registers.stackPop();
  },

  SCD(ctx, [n]) {
    // Modern SCHIP / XO-CHIP: always scroll N logical pixels (legacy HP-48
    // lores half-pixel scrolling is opt-in via legacyHalfPixelScroll).
    const lines = ctx.legacyHalfPixelScroll() && !ctx.isExtended() ? Math.floor(n / 2) : n;
    ctx.scrollDown(lines);
  },

  SCU(ctx, [n]) {
    const lines = ctx.legacyHalfPixelScroll() && !ctx.isExtended() ? Math.floor(n / 2) : n;
    ctx.scrollUp(lines);
  },

  SCR(ctx) {
    const pixels = ctx.legacyHalfPixelScroll() && !ctx.isExtended() ? 2 : 4;
    ctx.scrollRight(pixels);
  },

  SCL(ctx) {
    const pixels = ctx.legacyHalfPixelScroll() && !ctx.isExtended() ? 2 : 4;
    ctx.scrollLeft(pixels);
  },

  EXIT(ctx) {
    ctx.exit();
  },

  LOW(ctx) {
    ctx.setExtended(false);
  },

  HIGH(ctx) {
    ctx.setExtended(true);
  },

  JP_ADDR(ctx, [addr]) {
    ctx.registers.PC = addr;
  },

  CALL_ADDR(ctx, [addr]) {
    ctx.registers.stackPush(ctx.registers.PC);
    ctx.registers.PC = addr;
  },

  SE_VX_KK(ctx, [x, kk]) {
    if (ctx.registers.V[x] === kk) ctx.skipNext();
  },

  SNE_VX_KK(ctx, [x, kk]) {
    if (ctx.registers.V[x] !== kk) ctx.skipNext();
  },

  SE_VX_VY(ctx, [x, y]) {
    if (ctx.registers.V[x] === ctx.registers.V[y]) ctx.skipNext();
  },

  LD_VX_KK(ctx, [x, kk]) {
    ctx.registers.V[x] = kk;
  },

  ADD_VX_KK(ctx, [x, kk]) {
    ctx.registers.V[x] += kk;
  },

  LD_VX_VY(ctx, [x, y]) {
    ctx.registers.V[x] = ctx.registers.V[y];
  },

  OR_VX_VY(ctx, [x, y]) {
    ctx.registers.V[x] |= ctx.registers.V[y];
  },

  AND_VX_VY(ctx, [x, y]) {
    ctx.registers.V[x] &= ctx.registers.V[y];
  },

  XOR_VX_VY(ctx, [x, y]) {
    ctx.registers.V[x] ^= ctx.registers.V[y];
  },

  ADD_VX_VY(ctx, [x, y]) {
    const sum = ctx.registers.V[x] + ctx.registers.V[y];
    ctx.registers.V[0xf] = sum > 0xff ? 1 : 0;
    ctx.registers.V[x] = sum & 0xff;
  },

  SUB_VX_VY(ctx, [x, y]) {
    ctx.registers.V[0xf] = ctx.registers.V[x] >= ctx.registers.V[y] ? 1 : 0;
    ctx.registers.V[x] = (ctx.registers.V[x] - ctx.registers.V[y]) & 0xff;
  },

  SHR_VX_VY(ctx, [x]) {
    ctx.registers.V[0xf] = ctx.registers.V[x] & 1;
    ctx.registers.V[x] >>= 1;
  },

  SUBN_VX_VY(ctx, [x, y]) {
    ctx.registers.V[0xf] = ctx.registers.V[y] >= ctx.registers.V[x] ? 1 : 0;
    ctx.registers.V[x] = (ctx.registers.V[y] - ctx.registers.V[x]) & 0xff;
  },

  SHL_VX_VY(ctx, [x]) {
    ctx.registers.V[0xf] = (ctx.registers.V[x] & 0x80) >> 7;
    ctx.registers.V[x] <<= 1;
    ctx.registers.V[x] &= 0xff;
  },

  SNE_VX_VY(ctx, [x, y]) {
    if (ctx.registers.V[x] !== ctx.registers.V[y]) ctx.skipNext();
  },

  // XO: save Vx..Vy at I (inclusive, direction follows x→y), no I increment
  LD_I_VX_VY(ctx, [x, y]) {
    const step = rangeStep(x, y);
    let addr = ctx.registers.I;
    for (let r = x; ; r += step) {
      ctx.memory.write(addr++, ctx.registers.V[r]);
      if (r === y) break;
    }
  },

  // XO: load Vx..Vy from I (inclusive), no I increment
  LD_VX_VY_I(ctx, [x, y]) {
    const step = rangeStep(x, y);
    let addr = ctx.registers.I;
    for (let r = x; ; r += step) {
      ctx.registers.V[r] = ctx.memory.read(addr++);
      if (r === y) break;
    }
  },

  LD_I_ADDR(ctx, [addr]) {
    ctx.registers.I = addr;
  },

  // Handled in CPU.tick — kept so disassembler id resolves
  LD_I_LONG() {
    /* no-op: CPU loads I from the following word */
  },

  JP_V0_ADDR(ctx, [addr]) {
    ctx.registers.PC = (addr + ctx.registers.V[0]) & 0xffff;
  },

  RND_VX_KK(ctx, [x], opcode) {
    const rand = Math.floor(Math.random() * 256);
    ctx.registers.V[x] = rand & (opcode & 0xff);
  },

  DRW_VX_VY_N(ctx, [x, y], opcode) {
    const height = opcode & 0xf;
    const vx = ctx.registers.V[x];
    const vy = ctx.registers.V[y];
    const planeCount =
      (ctx.getPlaneMask() & 0b01 ? 1 : 0) + (ctx.getPlaneMask() & 0b10 ? 1 : 0);
    const planes = Math.max(planeCount, 1);

    let result;
    if (height === 0) {
      result = ctx.drawSprite16(
        vx,
        vy,
        ctx.memory.slice(ctx.registers.I, ctx.registers.I + 32 * planes)
      );
    } else {
      result = ctx.drawSprite(
        vx,
        vy,
        ctx.memory.slice(ctx.registers.I, ctx.registers.I + height * planes),
        height
      );
    }

    ctx.registers.V[0xf] = ctx.isExtended()
      ? result.collisionRows & 0xff
      : result.collision
        ? 1
        : 0;
  },

  SKP_VX(ctx, [x]) {
    if (ctx.isKeyPressed(ctx.registers.V[x])) ctx.skipNext();
  },

  SKNP_VX(ctx, [x]) {
    if (!ctx.isKeyPressed(ctx.registers.V[x])) ctx.skipNext();
  },

  LD_VX_DT(ctx, [x]) {
    ctx.registers.V[x] = ctx.registers.DT;
  },

  LD_VX_K(ctx, [x]) {
    ctx.registers.paused = true;
    ctx.waitForKeyPress((key) => {
      ctx.registers.V[x] = key;
      ctx.registers.paused = false;
    });
  },

  LD_DT_VX(ctx, [x]) {
    ctx.registers.DT = ctx.registers.V[x];
  },

  LD_ST_VX(ctx, [x]) {
    ctx.registers.ST = ctx.registers.V[x];
  },

  ADD_I_VX(ctx, [x]) {
    ctx.registers.I = (ctx.registers.I + ctx.registers.V[x]) & 0xffff;
  },

  LD_F_VX(ctx, [x]) {
    ctx.registers.I = SPRITE_SET_ADDRESS + (ctx.registers.V[x] & 0xf) * 5;
  },

  LD_HF_VX(ctx, [x]) {
    ctx.registers.I = LARGE_SPRITE_SET_ADDRESS + (ctx.registers.V[x] & 0xf) * 10;
  },

  LD_B_VX(ctx, [x]) {
    const value = ctx.registers.V[x];
    ctx.memory.write(ctx.registers.I, Math.floor(value / 100));
    ctx.memory.write(ctx.registers.I + 1, Math.floor((value % 100) / 10));
    ctx.memory.write(ctx.registers.I + 2, value % 10);
  },

  LD_I_VX(ctx, [x]) {
    for (let i = 0; i <= x; i++) {
      ctx.memory.write(ctx.registers.I + i, ctx.registers.V[i]);
    }
  },

  LD_VX_I(ctx, [x]) {
    for (let i = 0; i <= x; i++) {
      ctx.registers.V[i] = ctx.memory.read(ctx.registers.I + i);
    }
  },

  LD_R_VX(ctx, [x]) {
    ctx.saveFlags(x & 0xf);
  },

  LD_VX_R(ctx, [x]) {
    ctx.loadFlags(x & 0xf);
  },

  PLANE(ctx, [n]) {
    ctx.setPlaneMask(n & 0b11);
  },

  AUDIO(ctx) {
    ctx.loadAudioPattern();
  },

  PITCH_VX(ctx, [x]) {
    ctx.setPitch(ctx.registers.V[x]);
  },
};
