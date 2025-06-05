// js/core/gameLoop.js (v1.1 - Play Time Integration)

/**
 * @file gameLoop.js
 * @description Manages the main game loop, time, and updates for the incremental game.
 * It calls update functions for various game systems and modules at regular intervals.
 * v1.1: Integrated coreGameStateManager.updatePlayTime for total play time tracking.
 */

import { coreGameStateManager } from './coreGameStateManager.js';
import { coreResourceManager } from './coreResourceManager.js';
import { coreUIManager } from './coreUIManager.js';
// import { moduleLoader } from './moduleLoader.js'; // Will be needed when modules have update logic

// --- Game Loop State ---
let lastTickTime = performance.now();
let accumulatedTime = 0;
const TICK_INTERVAL = 1000 / 20; // 20 ticks per second for game logic updates
let isRunning = false;
let animationFrameId = null;

// --- Callbacks for different update phases ---
const updateCallbacks = {
    resourceGeneration: [], // For modules/systems that generate resources over time
    generalLogic: [],       // For general game logic updates in modules
    uiUpdate: [],           // For UI updates that need to happen each frame or tick
};

/**
 * The main game loop function.
 * Uses requestAnimationFrame for smooth rendering and timing.
 * It accumulates time and processes fixed-tick updates for game logic,
 * and then calls UI updates.
 * @param {DOMHighResTimeStamp} currentTime - The current time provided by requestAnimationFrame.
 */
function loop(currentTime) {
    if (!isRunning) {
        return;
    }

    const deltaTime = currentTime - lastTickTime;
    lastTickTime = currentTime;
    accumulatedTime += deltaTime;

    // Fixed tick updates for game logic
    // This ensures game logic runs at a consistent rate, regardless of frame rate fluctuations.
    while (accumulatedTime >= TICK_INTERVAL) {
        tick(TICK_INTERVAL / 1000); // Pass deltaTime in seconds
        accumulatedTime -= TICK_INTERVAL;
    }

    // UI updates can happen every frame for smoother visuals if needed
    // For now, we'll tie it to the game tick or a less frequent update.
    // updateUI(deltaTime / 1000); // Pass deltaTime in seconds for frame-based UI updates

    animationFrameId = requestAnimationFrame(loop);
}

/**
 * Processes a single game tick.
 * This is where core game logic, resource generation, and module updates occur.
 * @param {number} tickDeltaTime - The time elapsed since the last tick, in seconds.
 */
function tick(tickDeltaTime) {
    // --- IMPORTANT: Update total play time here ---
    // The tickDeltaTime is already in seconds, so we can pass it directly.
    coreGameStateManager.updatePlayTime(tickDeltaTime);
    // ------------------------------------------

    // 1. Resource Generation (e.g., based on production rates)
    coreResourceManager.updateResourceProduction(tickDeltaTime);
    updateCallbacks.resourceGeneration.forEach(cb => cb(tickDeltaTime));

    // 2. General Game Logic Updates (e.g., module-specific logic)
    // Example: moduleLoader.updateModules(tickDeltaTime);
    updateCallbacks.generalLogic.forEach(cb => cb(tickDeltaTime));
    coreGameStateManager.update(tickDeltaTime); // For any time-based global state changes

    // 3. UI Updates (can also be called less frequently or per frame in `loop`)
    // For now, let's update UI elements tied to resources/state after logic ticks.
    // More complex UI animations might be handled directly in `loop` or by coreUIManager.
    coreUIManager.updateResourceDisplay(); // Update resource bar
    // coreUIManager.renderMenu(); // REMOVED: This was causing flickering. Menu updates will be triggered explicitly.
    // coreUIManager.updateModuleUI(); // Tell active module to refresh its UI if needed
    updateCallbacks.uiUpdate.forEach(cb => cb(tickDeltaTime)); // For other UI updates
}

// Potentially a separate function for UI updates that run every frame if needed
// function updateUI(frameDeltaTime) {
// coreUIManager.render(frameDeltaTime);
// }

const gameLoop = {
    /**
     * Starts the game loop.
     */
    start() {
        if (isRunning) {
            // console.warn("Game loop is already running.");
            return;
        }
        isRunning = true;
        lastTickTime = performance.now(); // Reset time to prevent large initial deltaTime
        accumulatedTime = 0; // Reset accumulated time
        // console.log("Game loop started.");
        animationFrameId = requestAnimationFrame(loop);
    },

    /**
     * Stops the game loop.
     */
    stop() {
        if (!isRunning) {
            // console.warn("Game loop is not running.");
            return;
        }
        isRunning = false;
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        // console.log("Game loop stopped.");
    },

    /**
     * Checks if the game loop is currently running.
     * @returns {boolean} True if the loop is running, false otherwise.
     */
    isRunning() {
        return isRunning;
    },

    /**
     * Registers a callback function to be executed during a specific phase of the game tick.
     * @param {'resourceGeneration' | 'generalLogic' | 'uiUpdate'} phase - The phase to register the callback for.
     * @param {function(number): void} callback - The function to call. It will receive tickDeltaTime in seconds.
     */
    registerUpdateCallback(phase, callback) {
        if (updateCallbacks[phase] && typeof callback === 'function') {
            if (!updateCallbacks[phase].includes(callback)) {
                updateCallbacks[phase].push(callback);
            }
        } else {
            console.error(`Cannot register callback: Invalid phase "${phase}" or callback is not a function.`);
        }
    },

    /**
     * Unregisters a callback function from a specific phase.
     * @param {'resourceGeneration' | 'generalLogic' | 'uiUpdate'} phase - The phase to unregister from.
     * @param {function(number): void} callback - The callback function to remove.
     */
    unregisterUpdateCallback(phase, callback) {
        if (updateCallbacks[phase]) {
            updateCallbacks[phase] = updateCallbacks[phase].filter(cb => cb !== callback);
        }
    },

    /**
     * Gets the fixed tick interval in milliseconds.
     * @returns {number}
     */
    getTickIntervalMilliseconds() {
        return TICK_INTERVAL;
    }
};

// Automatically start the game loop or wait for an explicit call from main.js
// For now, let main.js decide when to start it after initialization.

export { gameLoop };
