// js/core/coreUpgradeManager.js (v1)

/**
 * @file coreUpgradeManager.js
 * @description Centralizes the management and application of various game modifiers
 * such as production multipliers, cost reductions, and other effects from skills,
 * achievements, and ascension bonuses. Modules will register their effects here
 * and query this manager to apply aggregated bonuses.
 */

import { loggingSystem } from './loggingSystem.js';
import { decimalUtility } from './decimalUtility.js';

// Internal storage for all registered effects.
// Structure:
// {
//   targetType: { // e.g., 'producer', 'resource'
//     effectCategory: { // e.g., 'productionMultiplier', 'costReduction'
//       targetId: { // e.g., 'student', 'studyPoints', 'global'
//         sourceId: Decimal // e.g., 'skill_autoStudy_level1', 'achievement_firstStudent', value
//       }
//     }
//   }
// }
let registeredEffects = {};

const coreUpgradeManager = {
    /**
     * Initializes the Core Upgrade Manager.
     */
    initialize() {
        registeredEffects = {}; // Clear any existing state on initialization
        loggingSystem.info("CoreUpgradeManager", "Core Upgrade Manager initialized.");
    },

    /**
     * Registers an effect from a source (e.g., a skill, an achievement).
     * Effects are typically additive or multiplicative. This system will aggregate them.
     *
     * @param {string} targetType - The type of game element being affected (e.g., 'producer', 'resource', 'global').
     * @param {string} effectCategory - The category of the effect (e.g., 'productionMultiplier', 'costReduction', 'resourceGain').
     * @param {string} targetId - The specific ID of the element being affected (e.g., 'student', 'studyPoints', 'global').
     * @param {string} sourceId - A unique ID for the source of this effect (e.g., 'skills_autoStudy_level1', 'achievements_firstStudent').
     * @param {Decimal|number|string} value - The numerical value of the effect. For multipliers, this is the multiplier itself (e.g., 1.1 for +10%). For additive, the amount.
     */
    registerEffect(targetType, effectCategory, targetId, sourceId, value) {
        if (!registeredEffects[targetType]) registeredEffects[targetType] = {};
        if (!registeredEffects[targetType][effectCategory]) registeredEffects[targetType][effectCategory] = {};
        if (!registeredEffects[targetType][effectCategory][targetId]) registeredEffects[targetType][effectCategory][targetId] = {};

        registeredEffects[targetType][effectCategory][targetId][sourceId] = decimalUtility.new(value);

        loggingSystem.debug("CoreUpgradeManager", `Registered effect: Type='${targetType}', Category='${effectCategory}', Target='${targetId}', Source='${sourceId}', Value=${value}`);
    },

    /**
     * Removes an effect from a specific source.
     * @param {string} targetType
     * @param {string} effectCategory
     * @param {string} targetId
     * @param {string} sourceId
     */
    removeEffect(targetType, effectCategory, targetId, sourceId) {
        if (registeredEffects[targetType] &&
            registeredEffects[targetType][effectCategory] &&
            registeredEffects[targetType][effectCategory][targetId] &&
            registeredEffects[targetType][effectCategory][targetId][sourceId]) {

            delete registeredEffects[targetType][effectCategory][targetId][sourceId];
            loggingSystem.debug("CoreUpgradeManager", `Removed effect: Type='${targetType}', Category='${effectCategory}', Target='${targetId}', Source='${sourceId}'`);

            // Clean up empty objects
            if (Object.keys(registeredEffects[targetType][effectCategory][targetId]).length === 0) {
                delete registeredEffects[targetType][effectCategory][targetId];
            }
            if (Object.keys(registeredEffects[targetType][effectCategory]).length === 0) {
                delete registeredEffects[targetType][effectCategory];
            }
            if (Object.keys(registeredEffects[targetType]).length === 0) {
                delete registeredEffects[targetType];
            }
        }
    },

    /**
     * Aggregates and returns the total multiplier for a specific target and effect category.
     * For production multipliers, this typically means (1 + sum of additive bonuses) * (product of multiplicative bonuses).
     * For cost reductions, it might be (1 - sum of reductions).
     *
     * @param {string} targetType - The type of game element (e.g., 'producer', 'resource', 'global').
     * @param {string} effectCategory - The category of the effect (e.g., 'productionMultiplier', 'costReduction').
     * @param {string} targetId - The specific ID of the element (e.g., 'student', 'studyPoints', 'global').
     * @returns {Decimal} The aggregated multiplier. Returns Decimal(1) for multipliers if no effects, Decimal(0) for additive if no effects.
     */
    getAggregatedModifier(targetType, effectCategory, targetId) {
        const effects = registeredEffects[targetType]?.[effectCategory]?.[targetId];
        if (!effects) {
            // Return default based on effect category
            if (effectCategory.includes('Multiplier')) {
                return decimalUtility.ONE; // Default multiplier is 1 (no change)
            }
            if (effectCategory.includes('Reduction') || effectCategory.includes('Bonus')) {
                return decimalUtility.ZERO; // Default additive bonus/reduction is 0
            }
            return decimalUtility.ONE; // Fallback
        }

        let totalAdditiveBonus = decimalUtility.ZERO;
        let totalMultiplicativeFactor = decimalUtility.ONE;

        // Separate additive and multiplicative effects if needed, or assume all are one type
        // For simplicity, let's assume all effects in 'productionMultiplier' are multiplicative factors (e.g., 1.1 for +10%)
        // and all in 'costReduction' are percentages (e.g., 0.1 for 10% reduction).
        // This logic needs to be refined based on how effects are actually registered (e.g., value is 0.1 for +10% vs 1.1 for x1.1)

        // For now, let's assume 'productionMultiplier' values are direct multipliers (e.g., 1.1, 1.2)
        // and we multiply them all together.
        if (effectCategory === 'productionMultiplier') {
            for (const sourceId in effects) {
                totalMultiplicativeFactor = decimalUtility.multiply(totalMultiplicativeFactor, effects[sourceId]);
            }
            return totalMultiplicativeFactor;
        }

        // For 'costReduction', assume values are reduction percentages (e.g., 0.1 for 10% reduction)
        // Sum them up, then apply as (1 - sum)
        if (effectCategory === 'costReduction') {
            for (const sourceId in effects) {
                totalAdditiveBonus = decimalUtility.add(totalAdditiveBonus, effects[sourceId]);
            }
            // Ensure reduction doesn't exceed 100%
            if (decimalUtility.gt(totalAdditiveBonus, 1)) {
                totalAdditiveBonus = decimalUtility.ONE;
            }
            return decimalUtility.subtract(decimalUtility.ONE, totalAdditiveBonus); // Returns a factor like 0.9 for 10% reduction
        }
        
        // For 'resourceGain', assume values are additive bonuses
        if (effectCategory === 'resourceGain') {
            for (const sourceId in effects) {
                totalAdditiveBonus = decimalUtility.add(totalAdditiveBonus, effects[sourceId]);
            }
            return totalAdditiveBonus;
        }

        // Default fallback if category not specifically handled
        return decimalUtility.ONE;
    },

    /**
     * Gets all registered effects. For debugging or save/load.
     * @returns {object} A deep copy of all registered effects.
     */
    getSaveData() {
        // Convert Decimals to strings for saving
        return JSON.parse(JSON.stringify(registeredEffects, (key, value) => {
            if (decimalUtility.isDecimal(value)) {
                return value.toString();
            }
            return value;
        }));
    },

    /**
     * Loads effects from saved data.
     * @param {object} saveData - The saved effects data.
     */
    loadSaveData(saveData) {
        registeredEffects = {}; // Clear current state
        if (!saveData) {
            loggingSystem.warn("CoreUpgradeManager", "loadSaveData: No save data provided for effects.");
            return;
        }
        // Revive Decimals from strings
        for (const targetType in saveData) {
            registeredEffects[targetType] = {};
            for (const effectCategory in saveData[targetType]) {
                registeredEffects[targetType][effectCategory] = {};
                for (const targetId in saveData[targetType][effectCategory]) {
                    registeredEffects[targetType][effectCategory][targetId] = {};
                    for (const sourceId in saveData[targetType][effectCategory][targetId]) {
                        registeredEffects[targetType][effectCategory][targetId][sourceId] = decimalUtility.new(saveData[targetType][effectCategory][targetId][sourceId]);
                    }
                }
            }
        }
        loggingSystem.info("CoreUpgradeManager", "Effects data loaded from save.");
    },

    /**
     * Resets all effects to an empty state.
     */
    resetState() {
        registeredEffects = {};
        loggingSystem.info("CoreUpgradeManager", "Core Upgrade Manager state reset.");
    }
};

// Initialize on load
coreUpgradeManager.initialize();

export { coreUpgradeManager };
