// modules/core_gameplay_module/core_gameplay_data.js

/**
 * @file core_gameplay_data.js
 * @description Static data definitions for the Core Gameplay module.
 * For this module, it's minimal as the primary resource "Study Points"
 * is expected to be defined by the core system or loaded.
 */

export const staticModuleData = {
    resourceId: "studyPoints", // The main resource this module interacts with
    clickAmount: 1, // Amount of Study Points gained per click
    ui: {
        mainButtonText: "Study Diligently",
        mainButtonTooltip: (amount) => `Gain ${amount} Study Point${amount === 1 ? "" : "s"}.`
    }
    // Other static configurations for this module could go here.
};
