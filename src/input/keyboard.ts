import { DigitalKeyMapping, KEYMAP, NUMBER_OF_KEYS } from "@/constants/keymap.constants";

export class Keyboard {
  /** Array of pressed Chip-8 keys (index 0–15) */
  public keyPressed: boolean[] = new Array(NUMBER_OF_KEYS).fill(false);
  /** Callback for FX0A wait-for-key */
  onNextKeyPress: ((key: number) => void) | null = null;

  /** Virtual keypad button id → Chip-8 key index */
  public readonly DigitalKeyMapping = DigitalKeyMapping;

  constructor() {
    window.addEventListener("keydown", (event) => this.onKeyDown(event));
    window.addEventListener("keyup", (event) => this.onKeyUp(event));
  }

  /** Checks if a Chip-8 key is pressed */
  public isKeyPressed(keyCode: number): boolean {
    return this.keyPressed[keyCode] || false;
  }

  /** Handle physical key down */
  private onKeyDown(event: KeyboardEvent) {
    const key = KEYMAP[event.code];
    if (key === undefined) return;

    this.keyPressed[key] = true;

    // FX0A: resolve on press (not release)
    if (this.onNextKeyPress) {
      this.onNextKeyPress(key);
      this.onNextKeyPress = null;
    }
  }

  /** Handle physical key up */
  private onKeyUp(event: KeyboardEvent) {
    const key = KEYMAP[event.code];
    if (key !== undefined) {
      this.keyPressed[key] = false;
    }
  }

  /**
   * Manually press/release a Chip-8 key (0–15).
   * Used by the virtual on-screen keypad.
   */
  public triggerKeyEvent(chip8Key: number, eventType: "keydown" | "keyup" | string) {
    if (chip8Key < 0 || chip8Key >= NUMBER_OF_KEYS) return;

    if (eventType === "keydown") {
      this.keyPressed[chip8Key] = true;
      if (this.onNextKeyPress) {
        this.onNextKeyPress(chip8Key);
        this.onNextKeyPress = null;
      }
    } else {
      this.keyPressed[chip8Key] = false;
    }
  }

  /** Wait for the next key press (for FX0A opcode) */
  waitForNextKeyPress(callback: (key: number) => void) {
    this.onNextKeyPress = callback;
  }

  /** Clear all key state (useful on reset) */
  reset(): void {
    this.keyPressed.fill(false);
    this.onNextKeyPress = null;
  }
}
