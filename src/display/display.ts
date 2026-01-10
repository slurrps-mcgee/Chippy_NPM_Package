import { DISPLAY_WIDTH, DISPLAY_HEIGHT } from "@/constants/display.constants";
import { SPRITE_WIDTH } from "@/constants/sprite.constants";

/**
 * Enhanced ImageData with a setPixel helper
 */
export class EnhancedImageData extends ImageData {
  setPixel(x: number, y: number, red: number, green: number, blue: number, alpha: number = 255) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const pixelStart = (y * this.width * 4) + (x * 4);
    this.data[pixelStart] = red;
    this.data[pixelStart + 1] = green;
    this.data[pixelStart + 2] = blue;
    this.data[pixelStart + 3] = alpha;
  }
}

/**
 * Display class for Chip8
 */
export class Display {
  public width = DISPLAY_WIDTH;
  public height = DISPLAY_HEIGHT;
  public frameBuffer: EnhancedImageData;

  private foregroundColor: [number, number, number] = [255, 255, 255]; // white
  private backgroundColor: [number, number, number] = [0, 0, 0]; // black

  constructor() {
    this.frameBuffer = new EnhancedImageData(this.width, this.height);
    this.clear();
  }

  /** Clear the screen */
  public clear() {
    const [r, g, b] = this.backgroundColor;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.frameBuffer.setPixel(x, y, r, g, b, 255);
      }
    }
  }

  /**
   * Draw a sprite at x, y. Returns true if any pixel was erased (collision)
   * Each sprite row is a byte (8 pixels)
   * Draws each CHIP-8 pixel as a single pixel in the framebuffer
   */
  public drawSprite(x: number, y: number, sprite: Uint8Array): boolean {
    let collision = false;
    const [bgR, bgG, bgB] = this.backgroundColor;

    for (let row = 0; row < sprite.length; row++) {
      let byte = sprite[row];
      for (let col = 0; col < SPRITE_WIDTH; col++) {
        const pixelOn = (byte & 0x80) !== 0;
        if (pixelOn) {
          const px = (x + col) % this.width;
          const py = (y + row) % this.height;
          const idx = (py * this.width + px) * 4;

          // Check if pixel is currently foreground
          const oldPixelOn = (
            this.frameBuffer.data[idx] === this.foregroundColor[0] &&
            this.frameBuffer.data[idx + 1] === this.foregroundColor[1] &&
            this.frameBuffer.data[idx + 2] === this.foregroundColor[2]
          ) ? 1 : 0;

          const newPixel = oldPixelOn ^ 1; // XOR

          this.frameBuffer.setPixel(px, py,
            newPixel ? this.foregroundColor[0] : bgR,
            newPixel ? this.foregroundColor[1] : bgG,
            newPixel ? this.foregroundColor[2] : bgB,
            255
          );

          if (oldPixelOn === 1 && newPixel === 0) collision = true;
        }
        byte <<= 1; // Shift to next bit
      }
    }

    return collision;
  }

  /** Set foreground color (white pixel color) */
  public setForegroundColor(color: string | [number, number, number]) {
    this.foregroundColor = this.parseColor(color);
  }

  /** Set background color (screen clear color) */
  public setBackgroundColor(color: string | [number, number, number]) {
    this.backgroundColor = this.parseColor(color);
    console.log('Background color set to:', this.backgroundColor);
  }

  /** Helper to parse color input: hex string or RGB array */
  private parseColor(color: string | [number, number, number]): [number, number, number] {
    if (typeof color === 'string') {
      color = color.replace(/^#/, '');
      if (color.length === 3) {
        color = color.split('').map(c => c + c).join('');
      }
      const num = parseInt(color, 16);
      return [
        (num >> 16) & 0xFF,
        (num >> 8) & 0xFF,
        num & 0xFF
      ];
    }
    return color;
  }
}
