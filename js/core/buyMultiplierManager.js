// js/core/buyMultiplierManager.js

/**
 * @file buyMultiplierManager.js
 * @description Manages the buy multiplier setting (e.g., x1, x10, x100, Max) for the game.
 * v2.0: Adds 'Max' buy option.
 */

import { loggingSystem } from './loggingSystem.js';

// The available multiplier values. Using -1 to represent 'Max'.
const MULTIPLIERS = [1, 10, 100, -1]; 
const MULTIPLIER_LABELS = {
    1: "x1",
    10: "x10",
    100: "x100",
    "-1": "Max"
};

// The current state
let currentMultiplier = 1;

const buyMultiplierManager = {
    /**
     * Initializes the buy multiplier manager.
     */
    initialize() {
        currentMultiplier = 1;
        loggingSystem.info("BuyMultiplierManager", "Buy Multiplier Manager initialized (v2.0). Default: x1.");
    },

    /**
     * Sets the new buy multiplier.
     * @param {number} newMultiplier - The new multiplier value (must be one of MULTIPLIERS).
     */
    setMultiplier(newMultiplier) {
        if (MULTIPLIERS.includes(newMultiplier) && newMultiplier !== currentMultiplier) {
            currentMultiplier = newMultiplier;
            loggingSystem.info("BuyMultiplierManager", `Multiplier set to: ${MULTIPLIER_LABELS[currentMultiplier]}`);
            document.dispatchEvent(new CustomEvent('buyMultiplierChanged', {
                detail: { newMultiplier: currentMultiplier }
            }));
        }
    },

    /**
     * Gets the current buy multiplier value.
     * @returns {number} The current multiplier (1, 10, 100, or -1 for Max).
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
    },

    /**
     * Gets the display label for a given multiplier value.
     * @param {number} multiplierValue 
     * @returns {string}
     */
    getMultiplierLabel(multiplierValue) {
        return MULTIPLIER_LABELS[multiplierValue] || `x${multiplierValue}`;
    }
};

export { buyMultiplierManager };
