// modules/skills_module/skills_state.js (v2 - Added Prestige Skills State)

/**
 * @file skills_state.js
 * @description Defines the dynamic state for the Skills module, including regular and prestige skills.
 * v2: Added prestigeSkillLevels to ensure they persist across prestiges.
 */

export let moduleState = {
    // Stores the current level of each purchased regular skill. Resets on prestige.
    // Key: skillId (e.g., 'basicLearning'), Value: number (level)
    skillLevels: {},

    // --- MODIFICATION: Added state for prestige skills ---
    // Stores the current level of each purchased prestige skill. Does NOT reset on prestige.
    // Key: skillId (e.g., 'prestigedInsight'), Value: number (level)
    prestigeSkillLevels: {},
};

/**
 * Gets the initial state for this module.
 * @returns {object} The initial state object.
 */
export function getInitialState() {
    // All skills start at level 0 (not purchased).
    return {
        skillLevels: {},
        prestigeSkillLevels: {} // Initialize as empty
    };
}
