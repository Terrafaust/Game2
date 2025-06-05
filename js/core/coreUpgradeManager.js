// js/core/coreUpgradeManager.js (v1)

/**
 * @file coreUpgradeManager.js
 * @description Manages effects from various sources (skills, achievements, etc.)
 * and aggregates them for application by target modules.
 * This is a foundational version and will be expanded upon.
 */

import { loggingSystem } from './loggingSystem.js';
import { decimalUtility } from './decimalUtility.js';

const registeredEffectSources = {
    // Example structure:
    // studies_production_multiplier: {
    //     moduleId_sourceKey: {
    //         id: 'moduleId_sourceKey',
    //         moduleId: 'skills', // The module providing the effect
    //         targetSystem: 'studies', // e.g., 'studies', 'global'
    //         targetId: 'student', // e.g., 'student' producer, 'studyPoints' resource, or null for global
    //         effectType: 'MULTIPLIER', // or 'ADDITIVE_BONUS', 'COST_REDUCTION'
    //         valueProvider: () => decimalUtility.new(1.1) // Function returning the current effect value (Decimal)
    //     }
    // }
};

const coreUpgradeManager = {
    /**
     * Initializes the CoreUpgradeManager.
     */
    initialize() {
        loggingSystem.info("CoreUpgradeManager", "Core Upgrade Manager initialized (v1 - Basic).");
    },

    /**
     * Registers an effect source.
     * @param {string} moduleId - The ID of the module providing the effect.
     * @param {string} sourceKey - A unique key for this specific effect source within the module.
     * @param {string} targetSystem - The system the effect targets (e.g., 'studies_producers', 'global_resource_production').
     * @param {string|null} targetId - Specific ID within the target system (e.g., 'student', 'studyPoints'), or null if global to the system.
     * @param {'MULTIPLIER' | 'ADDITIVE_BONUS' | 'PERCENTAGE_BONUS' | 'COST_REDUCTION_MULTIPLIER'} effectType - Type of the effect.
     * @param {function(): Decimal} valueProvider - A function that returns the current Decimal value of the effect.
     */
    registerEffectSource(moduleId, sourceKey, targetSystem, targetId, effectType, valueProvider) {
        if (!moduleId || !sourceKey || !targetSystem || !effectType || typeof valueProvider !== 'function') {
            loggingSystem.error("CoreUpgradeManager", "Invalid parameters for registerEffectSource.", { moduleId, sourceKey, targetSystem, targetId, effectType });
            return;
        }

        const effectKey = `${targetSystem}_${targetId || 'global'}_${effectType}`;
        if (!registeredEffectSources[effectKey]) {
            registeredEffectSources[effectKey] = {};
        }

        const fullSourceId = `${moduleId}_${sourceKey}`;
        registeredEffectSources[effectKey][fullSourceId] = {
            id: fullSourceId,
            moduleId,
            targetSystem,
            targetId,
            effectType,
            valueProvider
        };
        loggingSystem.debug("CoreUpgradeManager", `Registered effect source: ${fullSourceId} for key ${effectKey}`);
    },

    /**
     * Unregisters an effect source.
     * @param {string} moduleId - The ID of the module.
     * @param {string} sourceKey - The unique key for the effect source.
     * @param {string} targetSystem - The target system.
     * @param {string|null} targetId - Specific target ID.
     * @param {'MULTIPLIER' | 'ADDITIVE_BONUS' | 'PERCENTAGE_BONUS' | 'COST_REDUCTION_MULTIPLIER'} effectType - Type of the effect.
     */
    unregisterEffectSource(moduleId, sourceKey, targetSystem, targetId, effectType) {
        const effectKey = `${targetSystem}_${targetId || 'global'}_${effectType}`;
        const fullSourceId = `${moduleId}_${sourceKey}`;

        if (registeredEffectSources[effectKey] && registeredEffectSources[effectKey][fullSourceId]) {
            delete registeredEffectSources[effectKey][fullSourceId];
            loggingSystem.debug("CoreUpgradeManager", `Unregistered effect source: ${fullSourceId} for key ${effectKey}`);
            if (Object.keys(registeredEffectSources[effectKey]).length === 0) {
                delete registeredEffectSources[effectKey];
            }
        }
    },

    /**
     * Gets aggregated modifiers for a specific target and effect type.
     * This is a basic implementation. More sophisticated aggregation might be needed.
     * @param {string} targetSystem - The system the effect targets.
     * @param {string|null} targetId - Specific ID within the target system.
     * @param {'MULTIPLIER' | 'ADDITIVE_BONUS' | 'PERCENTAGE_BONUS' | 'COST_REDUCTION_MULTIPLIER'} effectType - Type of the effect.
     * @returns {Decimal} The aggregated modifier. For MULTIPLIER, it's the product. For ADDITIVE_BONUS, it's the sum.
     */
    getAggregatedModifiers(targetSystem, targetId, effectType) {
        const effectKey = `${targetSystem}_${targetId || 'global'}_${effectType}`;
        const sources = registeredEffectSources[effectKey];

        if (!sources || Object.keys(sources).length === 0) {
            // Return default "no effect" value based on type
            if (effectType.includes('MULTIPLIER')) return decimalUtility.new(1);
            return decimalUtility.new(0);
        }

        let aggregatedValue;

        if (effectType.includes('MULTIPLIER')) {
            aggregatedValue = decimalUtility.new(1);
            for (const sourceId in sources) {
                try {
                    const value = sources[sourceId].valueProvider();
                    aggregatedValue = decimalUtility.multiply(aggregatedValue, value);
                } catch (error) {
                    loggingSystem.error("CoreUpgradeManager", `Error in valueProvider for ${sourceId}`, error);
                }
            }
        } else if (effectType === 'ADDITIVE_BONUS' || effectType === 'PERCENTAGE_BONUS') { // Percentage treated as additive for now, or could be 0.xx
            aggregatedValue = decimalUtility.new(0);
            for (const sourceId in sources) {
                 try {
                    const value = sources[sourceId].valueProvider();
                    aggregatedValue = decimalUtility.add(aggregatedValue, value);
                } catch (error) {
                    loggingSystem.error("CoreUpgradeManager", `Error in valueProvider for ${sourceId}`, error);
                }
            }
        } else {
            loggingSystem.warn("CoreUpgradeManager", `Unknown effectType for aggregation: ${effectType}. Returning default.`);
            return effectType.includes('MULTIPLIER') ? decimalUtility.new(1) : decimalUtility.new(0);
        }
        return aggregatedValue;
    },

    /**
     * Helper to get a specific modifier value, commonly used for production multipliers.
     * @param {string} targetSystem - e.g., 'studies_producers'
     * @param {string} targetId - e.g., 'student'
     * @returns {Decimal} Multiplier (default 1 if no effects)
     */
    getProductionMultiplier(targetSystem, targetId) {
        return this.getAggregatedModifiers(targetSystem, targetId, 'MULTIPLIER');
    },

    /**
     * Helper to get cost reduction multiplier. (e.g., 0.9 for 10% reduction)
     * @param {string} targetSystem
     * @param {string} targetId
     * @returns {Decimal} Multiplier (default 1 if no effects)
     */
    getCostReductionMultiplier(targetSystem, targetId) {
         return this.getAggregatedModifiers(targetSystem, targetId, 'COST_REDUCTION_MULTIPLIER');
    }
};

// Initialize on load (main.js will ensure it's initialized before passing to moduleLoader)
// coreUpgradeManager.initialize(); // Initialization now handled by main.js sequence if needed

export { coreUpgradeManager };
