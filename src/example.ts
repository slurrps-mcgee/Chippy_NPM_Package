import { Chip8 } from "./chip8.js";
import type { Registers } from "./cpu/registers/registers";

const chip8 = new Chip8();
let followPc = true;
let uiWired = false;

const canvas = document.getElementById("screen") as HTMLCanvasElement;
canvas.width = chip8.display.width;
canvas.height = chip8.display.height;
const ctx = canvas.getContext("2d")!;
ctx.imageSmoothingEnabled = false;

const els = {
  romInput: document.getElementById("romLoader") as HTMLInputElement,
  btnRun: document.getElementById("btnRun") as HTMLButtonElement,
  btnPause: document.getElementById("btnPause") as HTMLButtonElement,
  btnResume: document.getElementById("btnResume") as HTMLButtonElement,
  btnStop: document.getElementById("btnStop") as HTMLButtonElement,
  btnStep: document.getElementById("btnStep") as HTMLButtonElement,
  btnReset: document.getElementById("btnReset") as HTMLButtonElement,
  btnClear: document.getElementById("btnClear") as HTMLButtonElement,
  speedSlider: document.getElementById("speedSlider") as HTMLInputElement,
  speedLabel: document.getElementById("speedLabel") as HTMLSpanElement,
  statusView: document.getElementById("statusView") as HTMLElement,
  fpsView: document.getElementById("fpsView") as HTMLElement,
  legacyScrollCheckbox: document.getElementById("legacyScrollCheckbox") as HTMLInputElement,
  spriteWrapCheckbox: document.getElementById("spriteWrapCheckbox") as HTMLInputElement,
  bgColor: document.getElementById("bgColor") as HTMLInputElement,
  plane0Color: document.getElementById("plane0Color") as HTMLInputElement,
  plane1Color: document.getElementById("plane1Color") as HTMLInputElement,
  overlapColor: document.getElementById("overlapColor") as HTMLInputElement,
  muteCheckbox: document.getElementById("muteCheckbox") as HTMLInputElement,
  volumeSlider: document.getElementById("volumeSlider") as HTMLInputElement,
  pitchView: document.getElementById("pitchView") as HTMLElement,
  btnEnableSound: document.getElementById("btnEnableSound") as HTMLButtonElement,
  btnDisableSound: document.getElementById("btnDisableSound") as HTMLButtonElement,
  registerView: document.getElementById("registerView") as HTMLElement,
  stackView: document.getElementById("stackView") as HTMLElement,
  opcodeView: document.getElementById("opcodeView") as HTMLElement,
  disasmView: document.getElementById("disasmView") as HTMLElement,
  memoryView: document.getElementById("memoryView") as HTMLElement,
  memBase: document.getElementById("memBase") as HTMLInputElement,
  btnMemPc: document.getElementById("btnMemPc") as HTMLButtonElement,
  keysView: document.getElementById("keysView") as HTMLElement,
};

function hex(n: number, width = 2): string {
  return (n & (width >= 4 ? 0xffff : 0xff)).toString(16).toUpperCase().padStart(width, "0");
}

function applyColors() {
  chip8.display.setBackgroundColor(els.bgColor.value);
  chip8.display.setPlane0Color(els.plane0Color.value);
  chip8.display.setPlane1Color(els.plane1Color.value);
  chip8.display.setOverlapColor(els.overlapColor.value);
}

function syncCanvasSize() {
  if (canvas.width !== chip8.display.width || canvas.height !== chip8.display.height) {
    canvas.width = chip8.display.width;
    canvas.height = chip8.display.height;
  }
}

function updateStatus() {
  const mode = chip8.isExtended() ? "hires 128×64" : "lores 64×32";
  const planes = `planes:${chip8.getPlaneMask().toString(2).padStart(2, "0")}`;
  let state = "running";
  if (!chip8.isRunning()) state = "stopped";
  else if (chip8.isPaused()) state = "paused";
  else if (chip8.cpu.registers.paused) state = "waiting for key (FX0A)";
  els.statusView.textContent = `${state} · ${mode} · ${planes}`;
}

function renderDebug(registers: Registers, fps: number) {
  els.fpsView.textContent = `FPS: ${fps.toFixed(1)} · IPS: ${chip8.getTargetIps()}`;
  updateStatus();

  const pitch = chip8.speaker.getPitch();
  const rate = Math.round(4000 * Math.pow(2, (pitch - 64) / 48));
  els.pitchView.textContent = `pitch: ${hex(pitch)} (${rate} Hz)`;

  const vRegs = Array.from(registers.V).map(
    (v, i) => `V${i.toString(16).toUpperCase()}:${hex(v)}`
  );

  els.registerView.textContent = [
    vRegs.slice(0, 8).join("  "),
    vRegs.slice(8).join("  "),
    `I :${hex(registers.I, 4)}   PC:${hex(registers.PC, 4)}   SP:${registers.SP}`,
    `DT:${hex(registers.DT)}     ST:${hex(registers.ST)}     paused:${registers.paused}`,
  ].join("\n");

  if (registers.SP < 0) {
    els.stackView.textContent = "(empty)";
  } else {
    const frames: string[] = [];
    for (let i = registers.SP; i >= 0; i--) {
      frames.push(`[${i}] ${hex(registers.stack[i], 4)}`);
    }
    els.stackView.textContent = frames.join("\n");
  }

  const opcode = chip8.getMemory().readOpcode(registers.PC);
  const { instruction, args } = chip8.disassemble(opcode);
  els.opcodeView.textContent = `PC:${hex(registers.PC, 4)}  opcode:0x${hex(opcode, 4)}`;

  if (opcode === 0xf000) {
    const imm = chip8.getMemory().readOpcode((registers.PC + 2) & 0xffff);
    els.disasmView.textContent = `LD I, long 0x${hex(imm, 4)}  (LD_I_LONG)`;
  } else {
    els.disasmView.textContent = instruction
      ? `${instruction.name}  args:[${args.map((a) => "0x" + hex(a)).join(", ")}]  (${instruction.id})`
      : "(invalid / unknown)";
  }

  if (followPc) {
    els.memBase.value = hex(registers.PC & ~0xf, 4);
  }
  renderMemoryDump();
  renderKeys();
}

function renderMemoryDump() {
  const base = parseInt(els.memBase.value, 16);
  if (Number.isNaN(base)) {
    els.memoryView.textContent = "invalid base";
    return;
  }

  const mem = chip8.getMemory();
  const memSize = mem.getSize();
  const lines: string[] = [];
  const start = Math.max(0, base & ~0xf);
  const end = Math.min(memSize - 1, start + 0xff);

  for (let addr = start; addr <= end; addr += 16) {
    const bytes: string[] = [];
    for (let i = 0; i < 16; i++) {
      const a = addr + i;
      bytes.push(a >= memSize ? "  " : hex(mem.read(a)));
    }
    const marker = addr <= chip8.cpu.registers.PC && chip8.cpu.registers.PC < addr + 16 ? ">" : " ";
    lines.push(`${marker}${hex(addr, 4)}: ${bytes.join(" ")}`);
  }
  els.memoryView.textContent = lines.join("\n");
}

function renderKeys() {
  const bits = chip8.keyboard.keyPressed.map((p) => (p ? "1" : "0")).join("");
  els.keysView.textContent = `keys: ${bits.slice(0, 4)} ${bits.slice(4, 8)} ${bits.slice(8, 12)} ${bits.slice(12, 16)}`;

  for (const [buttonId, chip8Key] of Object.entries(chip8.keyboard.DigitalKeyMapping)) {
    const button = document.getElementById(buttonId);
    if (!button) continue;
    button.classList.toggle("active-key", chip8.keyboard.keyPressed[chip8Key]);
  }
}

function wireUiOnce() {
  if (uiWired) return;
  uiWired = true;

  applyColors();
  chip8.setTargetIps(Number(els.speedSlider.value));
  els.volumeSlider.value = String(chip8.speaker.getVolume());

  chip8.onFrameFinished((frameBuffer, fps, registers) => {
    syncCanvasSize();
    ctx.putImageData(frameBuffer, 0, 0);
    renderDebug(registers, fps);
  });

  els.btnRun.addEventListener("click", async () => {
    await chip8.speaker.unlock();
    chip8.run();
    updateStatus();
  });
  els.btnPause.addEventListener("click", () => {
    chip8.pause();
    updateStatus();
  });
  els.btnResume.addEventListener("click", () => {
    chip8.resume();
    updateStatus();
  });
  els.btnStop.addEventListener("click", () => {
    chip8.stop();
    updateStatus();
    renderDebug(chip8.cpu.registers, chip8.getFps());
  });
  els.btnStep.addEventListener("click", () => {
    if (!chip8.isPaused() && chip8.isRunning()) chip8.pause();
    chip8.step();
    updateStatus();
  });
  els.btnReset.addEventListener("click", () => {
    chip8.reset();
    applyColors();
    renderDebug(chip8.cpu.registers, 0);
  });

  els.btnClear.addEventListener("click", () => {
    chip8.display.clear();
    syncCanvasSize();
    ctx.putImageData(chip8.display.frameBuffer, 0, 0);
  });

  for (const el of [els.bgColor, els.plane0Color, els.plane1Color, els.overlapColor]) {
    el.addEventListener("input", applyColors);
  }

  els.speedSlider.addEventListener("input", () => {
    const ips = Number(els.speedSlider.value);
    els.speedLabel.textContent = String(ips);
    chip8.setTargetIps(ips);
  });

  els.legacyScrollCheckbox.addEventListener("change", () => {
    chip8.setLegacyHalfPixelScroll(els.legacyScrollCheckbox.checked);
  });
  els.spriteWrapCheckbox.addEventListener("change", () => {
    chip8.display.spriteWrap = els.spriteWrapCheckbox.checked;
  });

  els.volumeSlider.addEventListener("input", () => {
    chip8.speaker.setVolume(parseFloat(els.volumeSlider.value));
  });

  els.muteCheckbox.addEventListener("change", () => {
    if (els.muteCheckbox.checked) chip8.speaker.mute();
    else chip8.speaker.unMute(parseFloat(els.volumeSlider.value));
  });

  els.btnEnableSound.addEventListener("click", () => {
    void chip8.speaker.enableSound();
  });
  els.btnDisableSound.addEventListener("click", () => {
    chip8.speaker.disableSound();
  });

  els.memBase.addEventListener("change", () => {
    followPc = false;
    renderMemoryDump();
  });
  els.btnMemPc.addEventListener("click", () => {
    followPc = true;
    renderMemoryDump();
  });

  for (const [buttonId, chip8Key] of Object.entries(chip8.keyboard.DigitalKeyMapping)) {
    const button = document.getElementById(buttonId);
    if (!button) continue;

    const down = (e: Event) => {
      e.preventDefault();
      chip8.keyboard.triggerKeyEvent(chip8Key, "keydown");
      renderKeys();
    };
    const up = (e: Event) => {
      e.preventDefault();
      chip8.keyboard.triggerKeyEvent(chip8Key, "keyup");
      renderKeys();
    };

    button.addEventListener("mousedown", down);
    button.addEventListener("mouseup", up);
    button.addEventListener("mouseleave", up);
    button.addEventListener("touchstart", down, { passive: false });
    button.addEventListener("touchend", up, { passive: false });
  }
}

els.romInput.addEventListener("change", async () => {
  if (!els.romInput.files?.[0]) return;

  wireUiOnce();
  applyColors();

  const romBuffer = new Uint8Array(await els.romInput.files[0].arrayBuffer());
  chip8.stop();
  chip8.loadRom(romBuffer);
  await chip8.speaker.unlock();
  chip8.run();
  renderDebug(chip8.cpu.registers, 0);
});

wireUiOnce();
applyColors();
ctx.putImageData(chip8.display.frameBuffer, 0, 0);
renderDebug(chip8.cpu.registers, 0);
