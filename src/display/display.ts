import {
  DISPLAY_HIRES_HEIGHT,
  DISPLAY_HIRES_WIDTH,
  DISPLAY_LORES_HEIGHT,
  DISPLAY_LORES_WIDTH,
} from "@/constants/display.constants";
import { SCHIP_SPRITE_WIDTH, SPRITE_WIDTH } from "@/constants/sprite.constants";

export class EnhancedImageData extends ImageData {
  setPixel(x: number, y: number, red: number, green: number, blue: number, alpha: number = 255) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const pixelStart = y * this.width * 4 + x * 4;
    this.data[pixelStart] = red;
    this.data[pixelStart + 1] = green;
    this.data[pixelStart + 2] = blue;
    this.data[pixelStart + 3] = alpha;
  }
}

export type DrawSpriteResult = {
  collision: boolean;
  collisionRows: number;
};

type ColorRGB = [number, number, number];

/**
 * CHIP-8 / SUPER-CHIP / XO-CHIP display with two XOR bitplanes (up to 4 colors).
 */
export class Display {
  public width = DISPLAY_LORES_WIDTH;
  public height = DISPLAY_LORES_HEIGHT;
  public frameBuffer: EnhancedImageData;
  public extended = false;

  /** Bitmask of active planes: bit0 = plane 1, bit1 = plane 2 (XO default = 1) */
  public planeMask = 0b01;

  private plane0 = new Uint8Array(DISPLAY_LORES_WIDTH * DISPLAY_LORES_HEIGHT);
  private plane1 = new Uint8Array(DISPLAY_LORES_WIDTH * DISPLAY_LORES_HEIGHT);

  private backgroundColor: ColorRGB = [0, 0, 0];
  private plane0Color: ColorRGB = [255, 255, 255];
  private plane1Color: ColorRGB = [255, 176, 0];
  private overlapColor: ColorRGB = [255, 80, 80];

  constructor() {
    this.frameBuffer = new EnhancedImageData(this.width, this.height);
    this.clear();
  }

  /** Clear selected plane(s); if none selected, no-op on buffers but still rebuild */
  public clear() {
    if (this.planeMask & 0b01) this.plane0.fill(0);
    if (this.planeMask & 0b10) this.plane1.fill(0);
    this.rebuildFrameBuffer();
  }

  /** Clear both planes regardless of mask (used on mode switch / soft reset) */
  public clearAll() {
    this.plane0.fill(0);
    this.plane1.fill(0);
    this.rebuildFrameBuffer();
  }

  public setPlaneMask(mask: number) {
    this.planeMask = mask & 0b11;
  }

  public setExtended(enabled: boolean) {
    if (this.extended === enabled) {
      this.clearAll();
      return;
    }
    this.extended = enabled;
    this.width = enabled ? DISPLAY_HIRES_WIDTH : DISPLAY_LORES_WIDTH;
    this.height = enabled ? DISPLAY_HIRES_HEIGHT : DISPLAY_LORES_HEIGHT;
    this.plane0 = new Uint8Array(this.width * this.height);
    this.plane1 = new Uint8Array(this.width * this.height);
    this.frameBuffer = new EnhancedImageData(this.width, this.height);
    this.clearAll();
  }

  /**
   * Draw an 8-pixel-wide sprite (`rows` bytes per selected plane).
   * Low-res wraps; high-res clips.
   */
  public drawSprite(x: number, y: number, data: Uint8Array, rows: number): DrawSpriteResult {
    return this.drawToSelectedPlanes(
      x,
      y,
      rows,
      SPRITE_WIDTH,
      (row, offset) => data[offset + row] ?? 0,
      rows
    );
  }

  /**
   * Draw a 16×16 sprite (32 bytes per selected plane).
   */
  public drawSprite16(x: number, y: number, data: Uint8Array): DrawSpriteResult {
    return this.drawToSelectedPlanes(
      x,
      y,
      16,
      SCHIP_SPRITE_WIDTH,
      (row, offset) => {
        const left = data[offset + row * 2] ?? 0;
        const right = data[offset + row * 2 + 1] ?? 0;
        return (left << 8) | right;
      },
      32
    );
  }

  public scrollDown(n: number) {
    this.scrollVertical(n, "down");
  }

  public scrollUp(n: number) {
    this.scrollVertical(n, "up");
  }

  public scrollRight(pixels: number) {
    this.scrollHorizontal(pixels, "right");
  }

  public scrollLeft(pixels: number) {
    this.scrollHorizontal(pixels, "left");
  }

  /** @deprecated Prefer setPlane0Color — maps to plane 1 (legacy “foreground”) */
  public setForegroundColor(color: string | ColorRGB) {
    this.setPlane0Color(color);
  }

  public setBackgroundColor(color: string | ColorRGB) {
    this.backgroundColor = this.parseColor(color);
    this.rebuildFrameBuffer();
  }

  public setPlane0Color(color: string | ColorRGB) {
    this.plane0Color = this.parseColor(color);
    this.rebuildFrameBuffer();
  }

  public setPlane1Color(color: string | ColorRGB) {
    this.plane1Color = this.parseColor(color);
    this.rebuildFrameBuffer();
  }

  public setOverlapColor(color: string | ColorRGB) {
    this.overlapColor = this.parseColor(color);
    this.rebuildFrameBuffer();
  }

  public getPixel(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return 0;
    const i = y * this.width + x;
    return (this.plane0[i] ? 1 : 0) | (this.plane1[i] ? 2 : 0);
  }

  private drawToSelectedPlanes(
    x: number,
    y: number,
    rows: number,
    bitWidth: number,
    rowBits: (row: number, byteOffset: number) => number,
    bytesPerPlane: number
  ): DrawSpriteResult {
    let collision = false;
    let collisionRows = 0;
    let byteOffset = 0;

    const drawOne = (plane: Uint8Array) => {
      const result = this.drawOntoPlane(plane, x, y, rows, bitWidth, (row) => rowBits(row, byteOffset));
      collision = collision || result.collision;
      collisionRows = Math.max(collisionRows, result.collisionRows);
      byteOffset += bytesPerPlane;
    };

    if (this.planeMask & 0b01) drawOne(this.plane0);
    if (this.planeMask & 0b10) drawOne(this.plane1);

    this.rebuildFrameBuffer();
    return { collision, collisionRows };
  }

  /**
   * Draw onto a plane. SUPER-CHIP / XO-CHIP clip at the edges; classic CHIP-8
   * wrap is available via `spriteWrap` for lores-only quirks testing.
   */
  public spriteWrap = false;

  private drawOntoPlane(
    plane: Uint8Array,
    x: number,
    y: number,
    height: number,
    bitWidth: number,
    rowBits: (row: number) => number
  ): DrawSpriteResult {
    let collision = false;
    let collisionRows = 0;
    // Modern SCHIP / XO-CHIP: always clip. Optional wrap for VIP-style CHIP-8.
    const wrap = this.spriteWrap && !this.extended;

    for (let row = 0; row < height; row++) {
      let rowHit = false;
      const py = y + row;

      if (!wrap && (py < 0 || py >= this.height)) {
        collisionRows++;
        continue;
      }

      const bits = rowBits(row);
      for (let col = 0; col < bitWidth; col++) {
        const mask = 1 << (bitWidth - 1 - col);
        if ((bits & mask) === 0) continue;

        let px = x + col;
        let drawY = py;

        if (wrap) {
          px = ((px % this.width) + this.width) % this.width;
          drawY = ((drawY % this.height) + this.height) % this.height;
        } else if (px < 0 || px >= this.width || drawY < 0 || drawY >= this.height) {
          rowHit = true;
          continue;
        }

        const index = drawY * this.width + px;
        const old = plane[index];
        const next = old ^ 1;
        plane[index] = next;
        if (old === 1 && next === 0) {
          collision = true;
          rowHit = true;
        }
      }

      if (rowHit) collisionRows++;
    }

    return { collision, collisionRows };
  }

  private forSelectedPlanes(fn: (plane: Uint8Array) => void) {
    if (this.planeMask & 0b01) fn(this.plane0);
    if (this.planeMask & 0b10) fn(this.plane1);
  }

  private scrollVertical(n: number, dir: "up" | "down") {
    if (n <= 0) return;
    const w = this.width;
    const h = this.height;
    const amount = Math.min(n, h);

    this.forSelectedPlanes((plane) => {
      if (dir === "down") {
        plane.copyWithin(amount * w, 0, (h - amount) * w);
        plane.fill(0, 0, amount * w);
      } else {
        plane.copyWithin(0, amount * w, h * w);
        plane.fill(0, (h - amount) * w);
      }
    });
    this.rebuildFrameBuffer();
  }

  private scrollHorizontal(pixels: number, dir: "left" | "right") {
    if (pixels <= 0) return;
    const w = this.width;
    const h = this.height;
    const amount = Math.min(pixels, w);

    this.forSelectedPlanes((plane) => {
      const next = new Uint8Array(plane.length);
      for (let y = 0; y < h; y++) {
        const row = y * w;
        if (dir === "right") {
          next.set(plane.subarray(row, row + w - amount), row + amount);
        } else {
          next.set(plane.subarray(row + amount, row + w), row);
        }
      }
      plane.set(next);
    });
    this.rebuildFrameBuffer();
  }

  private rebuildFrameBuffer() {
    const data = this.frameBuffer.data;
    const [br, bg, bb] = this.backgroundColor;
    const [p0r, p0g, p0b] = this.plane0Color;
    const [p1r, p1g, p1b] = this.plane1Color;
    const [or, og, ob] = this.overlapColor;

    for (let i = 0; i < this.plane0.length; i++) {
      const a = this.plane0[i] ? 1 : 0;
      const b = this.plane1[i] ? 1 : 0;
      const code = a | (b << 1);
      let r = br,
        g = bg,
        bl = bb;
      if (code === 1) {
        r = p0r;
        g = p0g;
        bl = p0b;
      } else if (code === 2) {
        r = p1r;
        g = p1g;
        bl = p1b;
      } else if (code === 3) {
        r = or;
        g = og;
        bl = ob;
      }
      const o = i * 4;
      data[o] = r;
      data[o + 1] = g;
      data[o + 2] = bl;
      data[o + 3] = 255;
    }
  }

  private parseColor(color: string | ColorRGB): ColorRGB {
    if (typeof color === "string") {
      let hex = color.replace(/^#/, "");
      if (hex.length === 3) {
        hex = hex
          .split("")
          .map((c) => c + c)
          .join("");
      }
      const num = parseInt(hex, 16);
      return [(num >> 16) & 0xff, (num >> 8) & 0xff, num & 0xff];
    }
    return color;
  }
}
