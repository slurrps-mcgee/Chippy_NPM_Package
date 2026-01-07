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
  width = DISPLAY_WIDTH;
  height = DISPLAY_HEIGHT;
  scale: number;
  scaledWidth: number;
  scaledHeight: number;
  frameBuffer: EnhancedImageData;

  foregroundColor: [number, number, number] = [255, 255, 255]; // white
  backgroundColor: [number, number, number] = [0, 0, 0];

  constructor(scale: number = 1) {
    this.scale = scale;
    this.scaledWidth = this.width * this.scale;
    this.scaledHeight = this.height * this.scale;
    this.frameBuffer = new EnhancedImageData(this.scaledWidth, this.scaledHeight);
    this.clear();
  }

  setForegroundColor(color: string | [number, number, number]) {
    this.foregroundColor = this.parseColor(color);
  }

  setBackgroundColor(color: string | [number, number, number]) {
    this.backgroundColor = this.parseColor(color);
  }
  
  // Framebuffer is always scaled; no need for getScaledFrameBuffer

  /** Clear the screen */
  clear() {
    for (let y = 0; y < this.scaledHeight; y++) {
      for (let x = 0; x < this.scaledWidth; x++) {
        this.frameBuffer.setPixel(x, y, this.backgroundColor[0], this.backgroundColor[1], this.backgroundColor[2], 255);
      }
    }
  }

  /**
   * Draw a sprite at x, y. Returns true if any pixel was erased (collision)
   * Each sprite row is a byte (8 pixels)
   * Draws each CHIP-8 pixel as a block of size scale x scale
   */
  drawSprite(x: number, y: number, sprite: Uint8Array): boolean {
    let collision = false;

    for (let row = 0; row < sprite.length; row++) {
      let byte = sprite[row];
      for (let col = 0; col < SPRITE_WIDTH; col++) {
        const pixel = (byte & 0x80) > 0 ? 1 : 0;
        if (pixel) {
          const px = (x + col) % this.width;
          const py = (y + row) % this.height;

          // Check collision for any pixel in the block
          let blockErased = false;
          for (let dy = 0; dy < this.scale; dy++) {
            for (let dx = 0; dx < this.scale; dx++) {
              const sx = px * this.scale + dx;
              const sy = py * this.scale + dy;
              const idx = (sy * this.scaledWidth + sx) * 4;
              const prev = this.frameBuffer.data[idx] > 0 ? 1 : 0;
              // XOR pixel
              const newPixel = prev ^ 1;
              this.frameBuffer.data[idx] = newPixel * this.foregroundColor[0];
              this.frameBuffer.data[idx + 1] = newPixel * this.foregroundColor[1];
              this.frameBuffer.data[idx + 2] = newPixel * this.foregroundColor[2];
              this.frameBuffer.data[idx + 3] = 255;
              if (prev === 1 && newPixel === 0) blockErased = true;
            }
          }
          if (blockErased) collision = true;
        }
        byte <<= 1; // Shift to next bit
      }
    }

    return collision;
  }

  // Helper to parse color inputs so either hex string or RGB tuple can be used
  private parseColor(color: string | [number, number, number]): [number, number, number] {
    if (typeof color === 'string') {
      // Remove '#' if present
      color = color.replace(/^#/, '');
      // Parse 3 or 6 digit hex
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
