// chip8.ts
import { CPU } from "@/cpu/cpu";
import { Display } from "@/display/display";
import { memory } from "@/memory/memory";
import { Audio } from "@/audio/audio";
import { Keyboard } from "@/input/keyboard";
import type { ExecutionContext } from "@/cpu/operations/executionContext";

export class Chip8 {
    // Core components
    cpu: CPU;
    display: Display;
    keyboard: Keyboard;
    speaker: Audio;

    // Execution context shared across CPU and peripherals
    private ctx: ExecutionContext;
    // Frame finished callback
    private frameFinishedCallback?: Function;

    // Frame rate management
    private fps = 0;
    private maxFps = 60;
    private interval = 1000 / this.maxFps;
    private previousTime = 0;

    // Initialize Chip8 system
    constructor() {
        // Initialize components
        this.display = new Display(); // Set scale to 10 configure later
        this.keyboard = new Keyboard();
        this.speaker = new Audio();
        this.cpu = new CPU();

        // Build execution context
        this.ctx = {
            registers: this.cpu.registers,
            memory: memory,
            drawSprite: (x, y, sprite) => this.display.drawSprite(x, y, sprite),
            isKeyPressed: (key) => this.keyboard.isKeyPressed(key),
            waitForKeyPress: (callback) => this.keyboard.onNextKeyPress = callback,
            decrementTimers: () => this.cpu.registers.updateTimers(),

        };
        
    }

    /** Starts the main emulator loop */
    run() {
        //runFrame loop
        requestAnimationFrame((time) => this.runFrame(time));
    }

    /** Load a ROM into memory */
    loadRom(romBuffer: Uint8Array) {
        // Reset system state
        this.ctx.memory.reset();
        this.cpu.reset();
        this.display.clear();

        // Load ROM into memory
        memory.loadROM(romBuffer);
    }

    /** Set a callback to receive rendered frame and CPU state */
    onFrameFinished(callback: Function) {
        this.frameFinishedCallback = callback;
    }

    /** Main frame loop, synced to browser's requestAnimationFrame */
    private runFrame(currentTime: number) {
        // Calculate delta time
        if (!this.previousTime) this.previousTime = currentTime;
        const delta = currentTime - this.previousTime;

        // If enough time has passed, run a frame
        if (delta >= this.interval) {
            // Update FPS
            this.fps = 1000 / delta;
            // Adjust previousTime to account for any excess time
            this.previousTime = currentTime - (delta % this.interval);

            // Execute CPU cycles (Chip8 is simpler than Gameboy, just tick once or N times)
            const cyclesPerFrame = 10; // adjust as needed
            for (let i = 0; i < cyclesPerFrame; i++) {
                this.cpu.tick(this.ctx);
                // Sound timer logic: play sound only if timer > 0
                // Sound should play per tick
                this.speaker.playSound(this.cpu.registers.ST);
            }

            // Fire frame callback
            if (this.frameFinishedCallback) {
                this.frameFinishedCallback(this.display.frameBuffer, this.fps, this.cpu.registers);
            }
        }

        // Request next frame
        requestAnimationFrame((time) => this.runFrame(time));
    }
}
