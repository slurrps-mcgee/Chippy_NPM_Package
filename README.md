# Chippy (`@slurrps/chippy`)

A browser-based **Chip-8 / SUPER-CHIP / XO-CHIP** emulator written in TypeScript with **zero runtime dependencies**.

Chippy exposes a small `Chip8` facade that owns the CPU, **64 KB** memory, dual-plane display (up to 4 colors), hex keypad, and XO pattern audio. Drop it into a canvas page, load a ROM, and call `run()`.

## Install

```bash
npm install @slurrps/chippy
```

Requires a modern browser (ES modules, `requestAnimationFrame`, Web Audio API, Canvas `ImageData`).

## Quick start

```ts
import { Chip8 } from "@slurrps/chippy";

const chip8 = new Chip8();
const canvas = document.querySelector("canvas")!;
const ctx = canvas.getContext("2d")!;
canvas.width = chip8.display.width;   // 64
canvas.height = chip8.display.height; // 32

chip8.display.setBackgroundColor("#282828");
chip8.display.setForegroundColor("#FFB000");

chip8.onFrameFinished((frameBuffer, fps, registers) => {
  ctx.putImageData(frameBuffer, 0, 0);
  // fps / registers available for debug UI
});

const rom = new Uint8Array(await (await fetch("/roms/pong.ch8")).arrayBuffer());
chip8.loadRom(rom);
await chip8.speaker.enableSound(); // call after a user gesture
chip8.run();
```

## Run the demo

**Live:** [https://slurrps.github.io/Chippy_NPM_Package/](https://slurrps.github.io/Chippy_NPM_Package/)

This repo includes a Vite demo with transport controls, audio settings, color pickers, a virtual keypad, and a live debugger. Pushes to `main` build and deploy it via GitHub Pages (`.github/workflows/pages.yml`).

```bash
npm install
npm run dev
```

Open the printed local URL, then load a `.ch8` or `.rom` file. **No sample ROMs are bundled** — grab public-domain Chip-8 ROMs from community collections (for example the classic test / game archives).

```bash
npm run build       # webpack → dist/chip8.js + dist/chip8.d.ts
npm run build:demo  # vite → dist-demo/ (GitHub Pages artifact)
npm run preview     # preview the Vite demo build
```

## Keyboard layout

Chip-8 uses a 16-key hex pad. Chippy maps it to QWERTY as follows:

```
Chip-8          Keyboard
1 2 3 C         1 2 3 4
4 5 6 D         Q W E R
7 8 9 E         A S D F
A 0 B F         Z X C V
```

The demo also provides an on-screen keypad (mouse / touch) that drives the same key state via `keyboard.triggerKeyEvent()`.

## Public API

### `Chip8`

| Method / property | Description |
|---|---|
| `new Chip8()` | Construct CPU, memory, display, keyboard, speaker |
| `loadRom(Uint8Array)` | Reset memory/CPU/display and load a ROM at `0x200` |
| `run()` | Start the `requestAnimationFrame` loop |
| `pause()` / `resume()` | Halt / continue instruction execution |
| `stop()` | Cancel the animation loop |
| `step()` | Execute one instruction (handy while paused) |
| `reset()` | Soft reset and reload the last ROM |
| `onFrameFinished(cb)` | `(frameBuffer, fps, registers) => void` each display frame |
| `getMemory()` | Per-instance 64 KB `Memory` |
| `disassemble(opcode)` | `{ instruction, args }` for a 16-bit opcode |
| `setTargetIps(n)` / `getTargetIps()` | Target instructions/sec (default **700**) |
| `setCyclesPerFrame(n)` / `getCyclesPerFrame()` | Convenience around IPS ÷ 60 |
| `getFps()` / `isRunning()` / `isPaused()` | Loop status |
| `cpu` / `display` / `keyboard` / `speaker` | Subsystems |

### Display

`clear()`, `clearAll()`, `setExtended(bool)`, `setPlaneMask(mask)`, `drawSprite` / `drawSprite16`, scroll helpers, and colors:

- `setBackgroundColor` / `setPlane0Color` / `setPlane1Color` / `setOverlapColor` (also `setForegroundColor` → plane 0)
- Colors accept `#rgb`, `#rrggbb`, or `[r, g, b]`

XO bitplanes: mask bit0 = plane 1, bit1 = plane 2 (default `0b01`). Clear / draw / scroll affect only selected planes. Drawing with both planes selected consumes 2× sprite bytes.

### Audio (`speaker`)

XO pattern audio: `loadPattern(16 bytes)`, `setPitch(vx)`, `getPitch()`, `playSound(st)`, plus `unlock` / mute / volume.

Playback rate = `4000 * 2^((pitch-64)/48)` Hz. The 16-byte buffer is 128 one-bit samples looped while ST > 0. Phase resets when ST hits 0.

### Keyboard

`isKeyPressed(key)`, `triggerKeyEvent(chip8Key, "keydown" \| "keyup")`, `waitForNextKeyPress(cb)`, `reset()`, `DigitalKeyMapping`, `keyPressed`.

### Memory

`read` / `write` / `slice` / `readOpcode` / `reset` / `loadROM` / `reloadLastRom` / `getRomLength` / `isAddressInROM`.

### CPU / registers

`cpu.tick(ctx)`, `cpu.reset()`, `cpu.disassemble(opcode)`, and `cpu.registers` (`V`, `I`, `PC`, `SP`, `stack`, `DT`, `ST`, `paused`).

## Architecture

```
Chip8 (facade + rAF loop)
├── CPU  → Disassembler → OPERATIONS table
├── Memory (64 KB, fonts at 0x000/0x050, ROM at 0x200)
├── Display (dual XOR planes → up to 4 colors, 64×32 / 128×64)
├── Keyboard (event.code + virtual pad)
└── Audio (XO 128-bit pattern buffer + pitch)
```

Each frame (~60 Hz):

1. Decrement delay / sound timers once.
2. Gate the beep from the sound timer.
3. Run a time-budgeted number of CPU instructions toward `targetIps`.
4. Fire `onFrameFinished` with the framebuffer, FPS, and registers.

CPU opcodes talk to hardware only through an internal `ExecutionContext` (`drawSprite`, `clearScreen`, memory, keys).

## Opcode support

**CHIP-8** — all 35 standard instructions (`00E0`–`FX65`).

**SUPER-CHIP 1.1** — scrolling, hi-res, EXIT, large font, RPL flags, 16×16 sprites.

**XO-CHIP** — also implemented:

| Opcode | Name | Behavior |
|---|---|---|
| `00DN` | SCU | Scroll up N pixels (N/2 in low-res) |
| `5XY2` | LD [I], Vx..Vy | Store register range at `I` (no `I` increment; order follows x→y) |
| `5XY3` | LD Vx..Vy, [I] | Load register range from `I` (no `I` increment) |
| `F000 NNNN` | LD I, long | Double-wide load of 16-bit immediate into `I` |
| `FN01` | PLANE n | Select drawing planes by bitmask (0–3) |
| `F002` | AUDIO | Copy 16 bytes from `I` into the pattern buffer |
| `FX3A` | LD pitch, Vx | Set pattern playback pitch |
| `FN75` / `FN85` | flags | Save/load `V0..Vn` to 16 flag registers (generalized SCHIP) |

Skip instructions (`3x`/`4x`/`5xy0`/`9xy0`/`Ex9E`/`ExA1`) skip **4** bytes when the following opcode is `F000`, so XO programs can detect support.

Quirks / notes:

- **Scrolling (modern default):** `00CN` / `00DN` move N pixels and `00FB`/`00FC` move 4 pixels in both lores and hires — matching modern SUPER-CHIP and XO-CHIP (Timendus scrolling test options 1, 3, 4, 5). Enable `setLegacyHalfPixelScroll(true)` for HP-48 legacy lores half-pixel amounts (option 2).
- Sprites **clip** at the screen edge by default (SCHIP/XO). Set `display.spriteWrap = true` for VIP-style wrap in lores.
- Shift ops (`8xy6` / `8xyE`) shift `Vx` in place (modern / SCHIP-style).
- `FX55` / `FX65` do **not** increment `I` (ranged `5xy2`/`5xy3` also leave `I` unchanged).
- In hi-res, `VF` is colliding/clipped row count; in lores it is 0/1.
- Memory is **64 KB**; `I` and `PC` are full 16-bit.
- Large font (`FX30`) covers digits **0–F**.
- RPL/XO flags persist across `loadRom` / `reset` for the life of a `Chip8` instance.

## Browser-only

Chippy is intended for the browser. It uses:

- `requestAnimationFrame` for the main loop
- `window` keyboard events
- Web Audio (`AudioContext`)
- Canvas `ImageData` for the display

Node / headless use would need polyfills and is outside the supported surface.

## Build & publish (maintainers)

```bash
npm run build       # webpack ESM bundle → dist/chip8.js
                    # copies types/chippy.d.ts → dist/chip8.d.ts
npm run build:demo  # vite static site → dist-demo/
npm run typecheck   # tsc --noEmit
```

Published package contents are limited to `dist/chip8.js`, `dist/chip8.d.ts`, `README.md`, and `LICENSE` (see the `files` field in `package.json`).

**GitHub Pages:** `.github/workflows/pages.yml` deploys `dist-demo` on every push to `main` (and via `workflow_dispatch`). In the repo settings, set **Pages → Source** to **GitHub Actions** once.

CI npm publish remains the manual `workflow_dispatch` workflow under `.github/workflows/npm.yml`.

## Optimization roadmap (done / next)

| Item | Status |
|---|---|
| Fix CLS (`clearScreen` in context) | Done |
| 60 Hz timers (not per-instruction) | Done |
| Time-based IPS scheduling (~700 IPS) | Done |
| Per-instance memory (no singleton) | Done |
| Boolean display grid + ImageData rebuild | Done |
| Audio oscillator reuse / gain gate | Done |
| Disassembler high-nibble jump groups | Done |
| FX0A on keydown + `event.code` keymap | Done |
| Public pause / stop / step / speed API | Done |
| Ship clean `.d.ts` without `@/` aliases | Done |
| SuperChip / SCHIP opcodes | Done |
| XO-CHIP (planes, 64KB, pattern audio, F000) | Done |
| Automated opcode / timer regression tests | Future |
| Optional demo deploy (GitHub Pages) | Done (`.github/workflows/pages.yml`) |

## License

MIT © Kenneth Lamb
