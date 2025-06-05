// js/core/gameLoop.js (v1.2 - Play Time Fix)

/**
 * @file gameLoop.js
 * @description Manages the main game loop, time, and updates for the incremental game.
 * It calls update functions for various game systems and modules at regular intervals.
 * v1.2: Corrected deltaTime unit passed to coreGameStateManager.updatePlayTime.
 * v1.1: Integrated coreGameStateManager.updatePlayTime for total play time tracking.
 */

import { coreGameStateManager } from './coreGameStateManager.js';
import { coreResourceManager } from './coreResourceManager.js';
import { coreUIManager } from './coreUIManager.js';
import { loggingSystem } from './loggingSystem.js'; // Import loggingSystem for debug

// --- Game Loop State ---
let lastTickTime = performance.now();
let accumulatedTime = 0;
const TICK_INTERVAL = 1000 / 20; // 20 ticks per second for game logic updates (50ms)
let isRunning = false;
let animationFrameId = null;

// --- Callbacks for different update phases ---
const updateCallbacks = {
    resourceGeneration: [], 
    generalLogic: [],       
    uiUpdate: [],           
};

/**
 * The main game loop function.
 */
function loop(currentTime) {
    if (!isRunning) {
        return;
    }

    const deltaTimeMs = currentTime - lastTickTime; // deltaTime is in milliseconds
    lastTickTime = currentTime;
    accumulatedTime += deltaTimeMs;

    // Fixed tick updates for game logic
    while (accumulatedTime >= TICK_INTERVAL) {
        // Pass TICK_INTERVAL (which is in ms) to tick function,
        // and tick function will convert it to seconds for its internal calculations.
        tick(TICK_INTERVAL); 
        accumulatedTime -= TICK_INTERVAL;
    }

    animationFrameId = requestAnimationFrame(loop);
}

/**
 * Processes a single game tick.
 * @param {number} tickIntervalMs - The fixed interval for this tick, in milliseconds.
 */
function tick(tickIntervalMs) {
    const tickDeltaTimeSeconds = tickIntervalMs / 1000; // Convert to seconds for physics/rate calculations

    // Update total play time with milliseconds
    coreGameStateManager.updatePlayTime(tickIntervalMs); 
    // loggingSystem.debug("GameLoop_Tick", `Play time updated with ${tickIntervalMs}ms. Total: ${coreGameStateManager.getTotalPlayTimeString()}`);


    // 1. Resource Generation
    coreResourceManager.updateResourceProduction(tickDeltaTimeSeconds);
    updateCallbacks.resourceGeneration.forEach(cb => cb(tickDeltaTimeSeconds));

    // 2. General Game Logic Updates
    updateCallbacks.generalLogic.forEach(cb => cb(tickDeltaTimeSeconds));
    coreGameStateManager.update(tickDeltaTimeSeconds); 

    // 3. UI Updates (typically less frequent than every tick if performance is a concern)
    // For now, called every tick.
    coreUIManager.updateResourceDisplay(); 
    updateCallbacks.uiUpdate.forEach(cb => cb(tickDeltaTimeSeconds)); 
}


const gameLoop = {
    start() {
        if (isRunning) {
            return;
        }
        isRunning = true;
        lastTickTime = performance.now(); 
        accumulatedTime = 0; 
        loggingSystem.info("GameLoop", "Game loop started.");
        animationFrameId = requestAnimationFrame(loop);
    },

    stop() {
        if (!isRunning) {
            return;
        }
        isRunning = false;
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        loggingSystem.info("GameLoop", "Game loop stopped.");
    },

    isRunning() {
        return isRunning;
    },

    registerUpdateCallback(phase, callback) {
        if (updateCallbacks[phase] && typeof callback === 'function') {
            if (!updateCallbacks[phase].includes(callback)) {
                updateCallbacks[phase].push(callback);
            }
        } else {
            loggingSystem.error("GameLoop", `Cannot register callback: Invalid phase "${phase}" or callback is not a function.`);
        }
    },

    unregisterUpdateCallback(phase, callback) {
        if (updateCallbacks[phase]) {
            updateCallbacks[phase] = updateCallbacks[phase].filter(cb => cb !== callback);
        }
    },

    getTickIntervalMilliseconds() {
        return TICK_INTERVAL;
    }
};

export { gameLoop };
