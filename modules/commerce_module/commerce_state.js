// js/modules/commerce_module/commerce_state.js 

/**
 * @file commerce_state.js
 * @description Defines the dynamic state for the Commerce module.
 * This state is managed by coreGameStateManager and saved/loaded.
 */

// The actual state object that will be populated on load or with defaults.
// Exporting this directly allows other module files (logic, ui) to import and use it.
export let moduleState = {
    // Stores the count of each purchasable item owned.
    // Key: purchasableId (e.g., 'imageGenerator', 'skillPointGenerator'), Value: Decimal (string representation)
    ownedPurchasables: {},
    // Flags for one-time purchases that unlock other content
    unlockedFlags: {
        settingsMenuUnlocked: false,
        achievementsMenuUnlocked: false,
    }
};

/**
 * Gets the initial state for this module.
 * @returns {object} The initial state object.
 */
export function getInitialState() {
    // Return a new object instance each time to avoid shared references if called multiple times.
    return {
        ownedPurchasables: {
            imageGenerator: "0",
            skillPointGenerator: "0",
            // One-time unlocks don't have an "owned count" in the same way,
            // their state is managed by global flags.
        },
        unlockedFlags: {
            settingsMenuUnlocked: false,
            achievementsMenuUnlocked: false,
        }
    };
}

// The module's initialize function in the manifest will handle loading
// the actual state from coreGameStateManager and populating `moduleState`.
// It will also handle converting string values back to Decimal objects.
