// modules/market_module/market_state.js (v2.0 - Roadmap Refactor)

/**
 * @file market_state.js
 * @description Defines the dynamic state for the Market module.
 * v2.0: Simplified state for roadmap. Removed automator state.
 * v1.1: Adds tracking for Prestige Skill Points purchases.
 */

// Exporting this directly allows other module files (logic, ui) to import and use it.
export let moduleState = {
    // Tracks how many of each "buyable" item that has a scaling cost has been bought.
    // This is important for calculating the current cost of items.
    purchaseCounts: {
        images: "0",
        studySkillPoints: "0",
        prestigeSkillPoints: "0"
    },
    // Unlocks are now stored as global flags, so no specific state is needed here.
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
        }
    };
}
