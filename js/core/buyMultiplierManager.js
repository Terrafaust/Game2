// js/core/buyMultiplierManager.js

/**
 * @file buyMultiplierManager.js
 * @description Manages the buy multiplier setting (e.g., x1, x10, x100) for the game.
 * This is a new core system to centralize the logic for bulk purchases.
 */

import { loggingSystem } from './loggingSystem.js';

// The available multiplier values
const MULTIPLIERS = [1, 10, 100];

// The current state
let currentMultiplier = 1;

const buyMultiplierManager = {
    /**
     * Initializes the buy multiplier manager.
     */
    initialize() {
        // For now, initialization is simple. We could load a saved preference here in the future.
        currentMultiplier = 1;
        loggingSystem.info("BuyMultiplierManager", "Buy Multiplier Manager initialized. Default: x1.");
    },

    /**
     * Sets the new buy multiplier.
     * @param {number} newMultiplier - The new multiplier value (must be one of MULTIPLIERS).
     */
    setMultiplier(newMultiplier) {
        if (MULTIPLIERS.includes(newMultiplier) && newMultiplier !== currentMultiplier) {
            currentMultiplier = newMultiplier;
            loggingSystem.info("BuyMultiplierManager", `Multiplier set to: x${currentMultiplier}`);
            // Dispatch a custom event to notify UI components of the change
            document.dispatchEvent(new CustomEvent('buyMultiplierChanged', {
                detail: { newMultiplier: currentMultiplier }
            }));
        }
    },

    /**
     * Gets the current buy multiplier value.
     * @returns {number} The current multiplier (1, 10, or 100).
     */
    getMultiplier() {
        return currentMultiplier;
    },

    /**
     * Gets the array of available multiplier options.
     * @returns {Array<number>}
     */
    getAvailableMultipliers() {
        return [...MULTIPLIERS];
    }
};

export { buyMultiplierManager };
