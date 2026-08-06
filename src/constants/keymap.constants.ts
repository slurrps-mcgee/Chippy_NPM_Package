/** Number of keys on the Chip-8 hex keypad */
export const NUMBER_OF_KEYS = 16;

/**
 * Maps KeyboardEvent.code → Chip-8 key index (0–15).
 * Layout mirrors the classic hex pad on a QWERTY keyboard:
 *
 *   1 2 3 4      →  1 2 3 C
 *   Q W E R      →  4 5 6 D
 *   A S D F      →  7 8 9 E
 *   Z X C V      →  A 0 B F
 */
export const KEYMAP: Record<string, number> = {
  Digit1: 0x1,
  Digit2: 0x2,
  Digit3: 0x3,
  Digit4: 0xc,
  KeyQ: 0x4,
  KeyW: 0x5,
  KeyE: 0x6,
  KeyR: 0xd,
  KeyA: 0x7,
  KeyS: 0x8,
  KeyD: 0x9,
  KeyF: 0xe,
  KeyZ: 0xa,
  KeyX: 0x0,
  KeyC: 0xb,
  KeyV: 0xf,
};

/**
 * Maps virtual keypad button element IDs → Chip-8 key index (0–15).
 */
export const DigitalKeyMapping: Record<string, number> = {
  key1: 0x1,
  key2: 0x2,
  key3: 0x3,
  keyC: 0xc,
  key4: 0x4,
  key5: 0x5,
  key6: 0x6,
  keyD: 0xd,
  key7: 0x7,
  key8: 0x8,
  key9: 0x9,
  keyE: 0xe,
  keyA: 0xa,
  key0: 0x0,
  keyB: 0xb,
  keyF: 0xf,
};
