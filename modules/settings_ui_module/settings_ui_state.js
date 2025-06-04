// js/modules/settings_ui_module/settings_ui_state.js 

/**
 * @file settings_ui_state.js
 * @description Defines the dynamic state for the Settings UI module.
 * This module primarily interacts with globalSettingsManager, so its own
 * internal state is minimal, mainly tracking which sub-sections are unlocked
 * if they have a purchase cost.
 */

// The actual state object that will be populated on load or with defaults.
// Exporting this directly allows other module files (logic, ui) to import and use it.
export let moduleState = {
    // Tracks if specific sections within the settings menu have been "unlocked" via purchase.
    // This is separate from the global flag that unlocks the main Settings tab.
    unlockedSections: {
        themes: false,
        statistics: false,
        automation: false,
        // Language, Save/Load, Logs are always unlocked by default
    },
};

/**
 * Gets the initial state for this module.
 * @returns {object} The initial state object.
 */
export function getInitialState() {
    // Return a new object instance each time to avoid shared references if called multiple times.
    return {
        unlockedSections: {
            themes: false,
            statistics: false,
            automation: false,
        },
    };
}
