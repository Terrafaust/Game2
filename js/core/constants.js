/**
 * @file constants.js
 * @description Central repository for shared string literals and keys to prevent typos and improve maintainability.
 */

// Resource IDs
export const RESOURCES = {
    STUDY_POINTS: 'studyPoints',
    KNOWLEDGE: 'knowledge',
    IMAGES: 'images',
    STUDY_SKILL_POINTS: 'studySkillPoints',
    PRESTIGE_SKILL_POINTS: 'prestigeSkillPoints',
    PRESTIGE_POINTS: 'prestigePoints',
    PRESTIGE_COUNT: 'prestigeCount'
};

// Global Flags used in coreGameStateManager
export const GLOBAL_FLAGS = {
    // Unlocks
    STUDIES_TAB_UNLOCKED: 'studiesTabPermanentlyUnlocked',
    MARKET_UNLOCKED: 'marketUnlocked',
    MARKET_TAB_UNLOCKED: 'marketTabPermanentlyUnlocked',
    PRESTIGE_UNLOCKED: 'prestigeUnlocked',
    SKILLS_TAB_UNLOCKED: 'skillsTabPermanentlyUnlocked',
    ACHIEVEMENTS_TAB_UNLOCKED: 'achievementsTabUnlocked',
    SETTINGS_TAB_UNLOCKED: 'settingsTabUnlocked',
    THEMES_UNLOCKED: 'themesUnlocked',
    GAME_STATS_UNLOCKED: 'gameStatsUnlocked',
    HAS_PRESTIGED_ONCE: 'hasPrestigedOnce',
    SECRET_MECHANIC_UNLOCKED: 'secretMechanicUnlocked',
};

// Core Upgrade Manager Target Systems
export const UPGRADE_TARGETS = {
    // Production
    GLOBAL_PRODUCTION: 'global_production',
    GLOBAL_RESOURCE_PRODUCTION: 'global_resource_production',
    STUDIES_PRODUCERS: 'studies_producers',
    STUDIES_PRODUCERS_KNOWLEDGE: 'studies_producers_knowledge',
    PRESTIGE_PRODUCERS: 'prestige_producers',
    CORE_GAMEPLAY_CLICK: 'core_gameplay_click',

    // Costs
    MARKET_ITEMS: 'market_items',
    SKILLS: 'skills',

    // Prestige
    PRESTIGE_MECHANICS: 'prestige_mechanics',
};

// Core Upgrade Manager Effect Types
export const EFFECT_TYPES = {
    MULTIPLIER: 'MULTIPLIER',
    COST_REDUCTION_MULTIPLIER: 'COST_REDUCTION_MULTIPLIER',
    COST_GROWTH_REDUCTION: 'COST_GROWTH_REDUCTION',
    ADDITIVE_BONUS: 'ADDITIVE_BONUS',
    RESOURCE_GAIN: 'RESOURCE_GAIN',
    UNLOCK_FEATURE: 'UNLOCK_FEATURE'
};

// Module IDs
export const MODULES = {
    CORE_GAMEPLAY: 'core_gameplay',
    STUDIES: 'studies',
    MARKET: 'market',
    SKILLS: 'skills',
    PRESTIGE: 'prestige',
    ACHIEVEMENTS: 'achievements',
    SETTINGS: 'settings_ui',
};
