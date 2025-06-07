// modules/skills_module/skills_state.js (v1)

/**
 * @file skills_state.js
 * @description Defines the dynamic state for the Skills module, primarily skill levels.
 */

export let moduleState = {
    // Stores the current level of each purchased skill.
    // Key: skillId (e.g., 'basicLearning'), Value: number (level)
    skillLevels: {},
};

/**
 * Gets the initial state for this module.
 * @returns {object} The initial state object.
 */
export function getInitialState() {
    // All skills start at level 0 (not purchased).
    // The skillLevels object will be populated as skills are purchased.
    return {
        skillLevels: {},
    };
}

