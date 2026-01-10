import { Chip8 } from "./chip8.js";

// Create Chip8 instance
const chip8 = new Chip8();

// Grab the canvas from the HTML
const canvas = document.getElementById("screen") as HTMLCanvasElement;
// Set canvas size based on display scale
canvas.width = chip8.display.width * chip8.display.scale;
canvas.height = chip8.display.height * chip8.display.scale;

const ctx = canvas.getContext("2d")!;
ctx.imageSmoothingEnabled = false;

// ROM loader (file input)
const romInput = document.getElementById("romLoader") as HTMLInputElement;
romInput.addEventListener("change", async () => {
    if (!romInput.files) return;
    const romBuffer = new Uint8Array(await romInput.files[0].arrayBuffer());
    // Load the ROM into the emulator
    chip8.loadRom(romBuffer);
    // Enable sound
    chip8.speaker.enableSound();

    // Customize Settings
    chip8.display.setBackgroundColor('#282828');
    chip8.display.setForegroundColor('#FFB000');

    setupVirtualKeyboard(chip8);
    setupVolumeControl(chip8);

    // Hook frame rendering from Chip8
    chip8.onFrameFinished((frameBuffer: any) => {
        ctx.putImageData(frameBuffer, 0, 0);
    });

    // Start the emulator
    chip8.run();
});



// Example volume control setup
function setupVolumeControl(chip8: Chip8) {
    const volumeSlider = document.getElementById("volumeSlider") as HTMLInputElement;
    volumeSlider.value = chip8.speaker.getVolume().toString();

    volumeSlider.addEventListener("input", () => {
        const volume = parseFloat(volumeSlider.value);
        chip8.speaker.setVolume(volume);
    });
}

//Example virtual keyboard setup
function setupVirtualKeyboard(chip8: Chip8) {
    for(let [buttonId, keycode] of Object.entries(chip8.keyboard.DigitalKeyMapping)) {
        const button = document.getElementById(buttonId);
        if (button) {
            // Mouse events
            button.addEventListener("mousedown", () => {
                chip8.keyboard.triggerKeyEvent(keycode, "keydown");
            });
            button.addEventListener("mouseup", () => {
                chip8.keyboard.triggerKeyEvent(keycode, "keyup");
            });
            // For touch devices
            button.addEventListener("touchstart", (e) => {
                e.preventDefault(); // Prevent mouse event emulation
                chip8.keyboard.triggerKeyEvent(keycode, "keydown");
            });
            button.addEventListener("touchend", (e) => {
                e.preventDefault(); // Prevent mouse event emulation
                chip8.keyboard.triggerKeyEvent(keycode, "keyup");
            });
        }
    }
}