// modules/achievements_module/achievements_state.js 

/**
 * @file achievements_state.js
 * @description Defines the dynamic state for the Achievements module.
 * This state is managed by coreGameStateManager and saved/loaded.
 */

// The actual state object that will be populated on load or with defaults.
// Exporting this directly allows other module files (logic, ui) to import and use it.
export let moduleState = {
    // Stores the completion status of each achievement.
    // Key: achievementId (e.g., 'firstStudent'), Value: boolean (true if unlocked)
    unlockedAchievements: {},
};

/**
 * Gets the initial state for this module.
 * @param {object} staticData - The static data for the module, containing achievement definitions.
 * @returns {object} The initial state object.
 */
export function getInitialState(staticData) {
    // Return a new object instance each time to avoid shared references if called multiple times.
    const initialState = {
        unlockedAchievements: {},
    };

    // Initialize all achievements to not unlocked based on the provided staticData
    for (const achievementId in staticData.achievements) {
        initialState.unlockedAchievements[achievementId] = false;
    }

    return initialState;
}
