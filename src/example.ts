import { Chip8 } from "./chip8.js";

// Create Chip8 instance
const chip8 = new Chip8();


// Grab the canvas from the HTML
const canvas = document.getElementById("screen") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

// Set canvas size based on display scale
canvas.width = chip8.display.width * chip8.display.scale;
canvas.height = chip8.display.height * chip8.display.scale;

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

    // Hook frame rendering from Chip8
    chip8.onFrameFinished((frameBuffer: any) => {
        ctx.imageSmoothingEnabled = false;
        ctx.putImageData(frameBuffer, 0, 0);
    });

    // Start the emulator
    chip8.run();
});


