// modules/market_module/market_state.js (v1.1 - Added Prestige Skill Points Tracking)

/**
 * @file market_state.js
 * @description Defines the dynamic state for the Market module.
 * This state is managed by coreGameStateManager and saved/loaded.
 * v1.1: Adds tracking for Prestige Skill Points purchases.
 */

// Exporting this directly allows other module files (logic, ui) to import and use it.
export let moduleState = {
    // Tracks how many of each "buyable" item that has a scaling cost has been bought.
    // This is important for calculating the current cost of items like Images, Study Skill Points, or Prestige Skill Points.
    // We don't store the *amount* of these resources here; that's in coreResourceManager.
    // We store the *number of times* their "buy" action was taken, if their cost scales per purchase.
    purchaseCounts: {
        images: "0",
        studySkillPoints: "0",
        prestigeSkillPoints: "0"
    },
    // No specific state needed for menu unlocks as they are one-time and use global flags.
    // If there were market items that had levels or other persistent state, they'd go here.
    // --- FEATURE: State for automations ---
    automatorLevels: {
        imageAutomator: 0
    },
    automationProgress: {
        imageAutomator: "0"
    }
    // --- END FEATURE ---
};

/**
 * Gets the initial state for this module.
 * @returns {object} The initial state object.
 */
export function getInitialState() {
    return {
        purchaseCounts: {
            images: "0",
            studySkillPoints: "0",
            prestigeSkillPoints: "0"
        },
        // --- FEATURE: Initial state for automations ---
        automatorLevels: {
            imageAutomator: 0
        },
        automationProgress: {
            imageAutomator: "0"
        }
        // --- END FEATURE ---
    };
}
