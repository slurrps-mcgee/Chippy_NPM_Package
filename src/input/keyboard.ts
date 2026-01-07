// keyboard.ts
import { KEYMAP, NUMBER_OF_KEYS } from "@/constants/keymap.constants";

export class Keyboard {
  /** Array of pressed keys */
  keyPressed: boolean[] = new Array(NUMBER_OF_KEYS).fill(false);

  /** Callback for waiting for next key press */
  onNextKeyPress: ((key: number) => void) | null = null;

  constructor() {
    // Listen to actual keyboard events
    window.addEventListener("keydown", (event) => this.onKeyDown(event));
    window.addEventListener("keyup", (event) => this.onKeyUp(event));
  }

  /** Checks if a key is pressed */
  isKeyPressed(keyCode: number): boolean {
    return this.keyPressed[keyCode] || false;
  }

  /** Handle physical key down */
  private onKeyDown(event: KeyboardEvent) {
    const key = KEYMAP[String(event.keyCode) as unknown as keyof typeof KEYMAP];
    if (key !== undefined) {
      this.keyPressed[key] = true;
    }
  }

  /** Handle physical key up */
  private onKeyUp(event: KeyboardEvent) {
    const key = KEYMAP[String(event.keyCode) as unknown as keyof typeof KEYMAP];
    if (key !== undefined) {
      this.keyPressed[key] = false;

      if (this.onNextKeyPress) {
        this.onNextKeyPress(key);
        this.onNextKeyPress = null;
      }
    }
  }

  /** Manually trigger a key press (useful for virtual or headless input) */
  triggerKeyDown(keyCode: number) {
    this.keyPressed[keyCode] = true;
  }

  /** Manually trigger a key release (useful for virtual or headless input) */
  triggerKeyUp(keyCode: number) {
    this.keyPressed[keyCode] = false;

    if (this.onNextKeyPress) {
      this.onNextKeyPress(keyCode);
      this.onNextKeyPress = null;
    }
  }

  /** Wait for the next key press (for FX0A opcode) */
  waitForNextKeyPress(callback: (key: number) => void) {
    this.onNextKeyPress = callback;
  }
}
