// js/core/coreUpgradeManager.js (v1.2 - Global Effect Aggregation)

/**
 * @file coreUpgradeManager.js
 * @description Manages effects from various sources (skills, achievements, etc.)
 * and aggregates them for application by target modules.
 * v1.2: Fixed getAggregatedModifiers to correctly apply 'ALL'-scoped effects to specific targets.
 * v1.1: Added logging to confirm registeredEffectSources initialization.
 */

import { loggingSystem } from './loggingSystem.js';
import { decimalUtility } from './decimalUtility.js';

// This object stores all registered effect sources.
// It is structured to allow quick lookups.
// Example: registeredEffectSources['studies_producers_student_MULTIPLIER']['skills_basicLearning'] = { effectDetails }
let registeredEffectSources = {};

const coreUpgradeManager = {
    /**
     * Initializes the CoreUpgradeManager.
     */
    initialize() {
        // For a clean start, let's ensure it's empty.
        registeredEffectSources = {}; 
        loggingSystem.info("CoreUpgradeManager", "Core Upgrade Manager initialized (v1.2). registeredEffectSources reset to empty object.");
        loggingSystem.debug("CoreUpgradeManager_Init", "Initial state of registeredEffectSources:", registeredEffectSources);
    },

    /**
     * Registers an effect source.
     * @param {string} moduleId - The ID of the module providing the effect.
     * @param {string} sourceKey - A unique key for this specific effect source within the module.
     * @param {string} targetSystem - The system the effect targets (e.g., 'studies_producers', 'global_resource_production').
     * @param {string|null} targetId - Specific ID within the target system (e.g., 'student', 'studyPoints'), or 'ALL'/'global' if it applies to the whole system.
     * @param {'MULTIPLIER' | 'ADDITIVE_BONUS' | 'PERCENTAGE_BONUS' | 'COST_REDUCTION_MULTIPLIER'} effectType - Type of the effect.
     * @param {function(): Decimal} valueProvider - A function that returns the current Decimal value of the effect.
     */
    registerEffectSource(moduleId, sourceKey, targetSystem, targetId, effectType, valueProvider) {
        if (!moduleId || !sourceKey || !targetSystem || !effectType || typeof valueProvider !== 'function') {
            loggingSystem.error("CoreUpgradeManager_Register", "Invalid parameters for registerEffectSource.", { moduleId, sourceKey, targetSystem, targetId, effectType });
            return;
        }

        // Construct a unique key for the specific effect type being targeted.
        // Example: 'studies_producers_student_MULTIPLIER' or 'studies_producers_ALL_COST_REDUCTION_MULTIPLIER'
        const effectKey = `${targetSystem}_${targetId || 'global'}_${effectType}`;
        
        if (!registeredEffectSources[effectKey]) {
            registeredEffectSources[effectKey] = {};
        }

        const fullSourceId = `${moduleId}_${sourceKey}`; // Unique ID for the source providing this specific effect.
        registeredEffectSources[effectKey][fullSourceId] = {
            id: fullSourceId,
            moduleId,
            targetSystem,
            targetId,
            effectType,
            valueProvider
        };
        loggingSystem.debug("CoreUpgradeManager_Register", `Registered effect source: '${fullSourceId}' for effect key '${effectKey}'.`);
    },

    /**
     * Unregisters an effect source.
     */
    unregisterEffectSource(moduleId, sourceKey, targetSystem, targetId, effectType) {
        const effectKey = `${targetSystem}_${targetId || 'global'}_${effectType}`;
        const fullSourceId = `${moduleId}_${sourceKey}`;

        if (registeredEffectSources[effectKey] && registeredEffectSources[effectKey][fullSourceId]) {
            delete registeredEffectSources[effectKey][fullSourceId];
            loggingSystem.debug("CoreUpgradeManager_Unregister", `Unregistered effect source: ${fullSourceId} for key ${effectKey}`);
            if (Object.keys(registeredEffectSources[effectKey]).length === 0) {
                delete registeredEffectSources[effectKey];
                 loggingSystem.debug("CoreUpgradeManager_Unregister", `Removed empty effect key: ${effectKey}`);
            }
        } else {
            loggingSystem.warn("CoreUpgradeManager_Unregister", `Attempted to unregister non-existent source: ${fullSourceId} for key ${effectKey}`);
        }
    },

    /**
     * Gets aggregated modifiers for a specific target and effect type.
     * This now correctly combines effects targeted at a specific ID (e.g., 'student')
     * with effects targeted at 'ALL' within the same system.
     */
    getAggregatedModifiers(targetSystem, targetId, effectType) {
        // --- MODIFICATION START ---
        // 1. Get sources for the specific target ID (e.g., 'student')
        const specificEffectKey = `${targetSystem}_${targetId || 'global'}_${effectType}`;
        const sourcesForSpecificKey = registeredEffectSources[specificEffectKey];

        // 2. Get sources for the 'ALL' target ID within the same system
        const globalEffectKey = `${targetSystem}_ALL_${effectType}`;
        const sourcesForGlobalKey = registeredEffectSources[globalEffectKey];
        
        // loggingSystem.debug("CoreUpgradeManager_GetAggregated", `Checking keys: [Specific: ${specificEffectKey}], [Global: ${globalEffectKey}]`);

        // Initialize accumulator based on effect type
        let aggregatedValue;
        if (effectType.includes('MULTIPLIER')) {
            aggregatedValue = decimalUtility.new(1);
        } else { // Additive bonuses
            aggregatedValue = decimalUtility.new(0);
        }

        // Helper function to process a set of sources
        const processSources = (sources) => {
            if (!sources || Object.keys(sources).length === 0) {
                return;
            }

            if (effectType.includes('MULTIPLIER')) {
                for (const sourceIdKey in sources) {
                    const effectDetails = sources[sourceIdKey];
                    try {
                        const value = effectDetails.valueProvider();
                        aggregatedValue = decimalUtility.multiply(aggregatedValue, value);
                    } catch (error) {
                        loggingSystem.error("CoreUpgradeManager_GetAggregated", `Error in valueProvider for ${sourceIdKey} (effectKey: ${specificEffectKey})`, error);
                    }
                }
            } else if (effectType === 'ADDITIVE_BONUS' || effectType === 'PERCENTAGE_BONUS') {
                for (const sourceIdKey in sources) {
                    const effectDetails = sources[sourceIdKey];
                    try {
                        const value = effectDetails.valueProvider();
                        aggregatedValue = decimalUtility.add(aggregatedValue, value);
                    } catch (error) {
                        loggingSystem.error("CoreUpgradeManager_GetAggregated", `Error in valueProvider for ${sourceIdKey} (effectKey: ${specificEffectKey})`, error);
                    }
                }
            }
        };

        // Process both specific and global sources
        processSources(sourcesForSpecificKey);
        processSources(sourcesForGlobalKey);

        return aggregatedValue;
        // --- MODIFICATION END ---
    },

    getProductionMultiplier(targetSystem, targetId) {
        return this.getAggregatedModifiers(targetSystem, targetId, 'MULTIPLIER');
    },

    getCostReductionMultiplier(targetSystem, targetId) {
         return this.getAggregatedModifiers(targetSystem, targetId, 'COST_REDUCTION_MULTIPLIER');
    },

    // Method to inspect all registered effects, useful for debugging
    getAllRegisteredEffects() {
        try {
            return JSON.parse(JSON.stringify(registeredEffectSources)); // Return a deep copy
        } catch (e) {
            // This might fail if valueProvider functions are not serializable,
            // which they aren't. So, a shallow copy or custom serialization is needed for inspection.
            const inspectableCopy = {};
            for (const effectKey in registeredEffectSources) {
                inspectableCopy[effectKey] = {};
                for (const sourceId in registeredEffectSources[effectKey]) {
                    const { id, moduleId, targetSystem, targetId, effectType } = registeredEffectSources[effectKey][sourceId];
                    // Try to get current value for inspection, but handle errors
                    let currentValue = 'N/A (error or not a Decimal)';
                    try {
                        const val = registeredEffectSources[effectKey][sourceId].valueProvider();
                        if (decimalUtility.isDecimal(val)) {
                            currentValue = val.toString();
                        } else {
                            currentValue = String(val);
                        }
                    } catch (err) { /* ignore error for inspection */ }

                    inspectableCopy[effectKey][sourceId] = { id, moduleId, targetSystem, targetId, effectType, currentValue };
                }
            }
            return inspectableCopy;
        }
    }
};

export { coreUpgradeManager };
