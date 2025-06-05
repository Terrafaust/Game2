// js/modules/core_gameplay_module/core_gameplay_state.js

/**
 * @file core_gameplay_state.js
 * @description Defines the dynamic state for the Core Gameplay module.
 * This state is managed by coreGameStateManager and saved/loaded.
 */

// The actual state object that will be populated on load or with defaults.
// Exporting this directly allows other module files (logic, ui) to import and use it.
export let moduleState = {
    totalManualClicks: 0, // Example: track how many times the button was clicked
    // Add other state properties specific to this module if needed.
    // For this simple module, state is very minimal.
};

/**
 * Gets the initial state for this module.
 * @returns {object} The initial state object.
 */
export function getInitialState() {
    // Return a new object instance each time to avoid shared references if called multiple times.
    return {
        totalManualClicks: 0,
    };
}

// The module's initialize function in the manifest will handle loading
// the actual state from coreGameStateManager and populating `moduleState`.
