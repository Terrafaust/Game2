// modules/achievements_module/achievements_state.js (v1)

/**
 * @file achievements_state.js
 * @description Defines the dynamic state for the Achievements module.
 * Stores which achievements have been completed.
 */

export let moduleState = {
    // Key: achievementId, Value: boolean (true if completed)
    completedAchievements: {},
};

/**
 * Gets the initial state for this module.
 * @returns {object} The initial state object.
 */
export function getInitialState() {
    return {
        completedAchievements: {},
    };
}

