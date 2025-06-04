// modules/studies_module/studies_state.js

/**
 * @file studies_state.js
 * @description Defines the dynamic state for the Studies module.
 * This state is managed by coreGameStateManager and saved/loaded.
 */

// The actual state object that will be populated on load or with defaults.
// Exporting this directly allows other module files (logic, ui) to import and use it.
export let moduleState = {
    // Stores the count of each producer owned.
    // Key: producerId (e.g., 'student', 'classroom'), Value: Decimal (use Decimal for counts too for consistency)
    ownedProducers: {},
};

/**
 * Gets the initial state for this module.
 * @returns {object} The initial state object.
 */
export function getInitialState() {
    // Return a new object instance each time to avoid shared references if called multiple times.
    return {
        ownedProducers: {
            // Initial counts for all producers should be 0.
            // Explicitly listing them ensures they are part of the saved state structure.
            student: "0",
            classroom: "0",
            kindergarten: "0",
            elementarySchool: "0",
            middleSchool: "0",
            highSchool: "0",
            university: "0",
            professor: "0",
        },
    };
}

// The module's initialize function in the manifest will handle loading
// the actual state from coreGameStateManager and populating `moduleState`.
// It will also handle converting string values back to Decimal objects.
