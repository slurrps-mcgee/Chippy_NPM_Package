// keyboard.ts
import { DigitalKeyMapping, KEYMAP, NUMBER_OF_KEYS } from "@/constants/keymap.constants";

export class Keyboard {
  /** Array of pressed keys */
  public keyPressed: boolean[] = new Array(NUMBER_OF_KEYS).fill(false);
  /** Callback for waiting for next key press */
  onNextKeyPress: ((key: number) => void) | null = null;

  /** Digital key mapping */
  public readonly DigitalKeyMapping = DigitalKeyMapping;

  constructor() {
    // Listen to actual keyboard events
    window.addEventListener("keydown", (event) => this.onKeyDown(event));
    window.addEventListener("keyup", (event) => this.onKeyUp(event));
  }

  /** Checks if a key is pressed */
  public isKeyPressed(keyCode: number): boolean {
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

  /** Manually trigger a key*/
  public triggerKeyEvent(keyCode: number, eventType: string) {
    const event = new KeyboardEvent(eventType, { 
      key: keyCode.toString(),
      keyCode: keyCode,
      charCode: 0,
      bubbles: true
    });

    if (eventType == "keydown") {
      this.onKeyDown(event);
    }
    else {
      this.onKeyUp(event);
    }
  }

  /** Wait for the next key press (for FX0A opcode) */
  waitForNextKeyPress(callback: (key: number) => void) {
    this.onNextKeyPress = callback;
  }
}
