// modules/skills_module/skills_state.js 

/**
 * @file skills_state.js
 * @description Defines the dynamic state for the Skills module.
 * This state is managed by coreGameStateManager and saved/loaded.
 */

// The actual state object that will be populated on load or with defaults.
// Exporting this directly allows other module files (logic, ui) to import and use it.
export let moduleState = {
    // Stores the current level of each skill.
    // Key: skillId (e.g., 'focusedStudy'), Value: number (current level)
    skillLevels: {},
};

/**
 * Gets the initial state for this module.
 * @param {object} staticData - The static data for the module, containing skill definitions.
 * @returns {object} The initial state object.
 */
export function getInitialState(staticData) {
    // Return a new object instance each time to avoid shared references if called multiple times.
    const initialState = {
        skillLevels: {},
    };

    // Initialize all skills to level 0 based on the provided staticData
    for (const skillId in staticData.skills) {
        initialState.skillLevels[skillId] = 0;
    }

    return initialState;
}
