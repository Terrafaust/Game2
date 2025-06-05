// js/core/coreUpgradeManager.js (v1.1 - Initialization Logging)

/**
 * @file coreUpgradeManager.js
 * @description Manages effects from various sources (skills, achievements, etc.)
 * and aggregates them for application by target modules.
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
        // registeredEffectSources is already initialized globally.
        // We can clear it here if a full reset of effects is needed upon re-initialization,
        // though typically modules would unregister/re-register effects.
        // For a clean start, let's ensure it's empty.
        registeredEffectSources = {}; 
        loggingSystem.info("CoreUpgradeManager", "Core Upgrade Manager initialized (v1.1). registeredEffectSources reset to empty object.");
        loggingSystem.debug("CoreUpgradeManager_Init", "Initial state of registeredEffectSources:", registeredEffectSources);
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
            loggingSystem.error("CoreUpgradeManager_Register", "Invalid parameters for registerEffectSource.", { moduleId, sourceKey, targetSystem, targetId, effectType });
            return;
        }

        // Construct a unique key for the specific effect type being targeted.
        // Example: 'studies_producers_student_MULTIPLIER' or 'global_resource_production_studyPoints_MULTIPLIER'
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
        loggingSystem.debug("CoreUpgradeManager_Register", `Registered effect source: '${fullSourceId}' for effect key '${effectKey}'. Current sources for this key:`, Object.keys(registeredEffectSources[effectKey]));
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
     */
    getAggregatedModifiers(targetSystem, targetId, effectType) {
        const effectKey = `${targetSystem}_${targetId || 'global'}_${effectType}`;
        const sourcesForEffectKey = registeredEffectSources[effectKey]; // This will be an object of sources, or undefined

        // loggingSystem.debug("CoreUpgradeManager_GetAggregated", `Getting modifiers for effectKey: '${effectKey}'. Sources found:`, sourcesForEffectKey ? Object.keys(sourcesForEffectKey) : 'None');

        if (!sourcesForEffectKey || Object.keys(sourcesForEffectKey).length === 0) {
            if (effectType.includes('MULTIPLIER')) return decimalUtility.new(1); // Default for multipliers is 1 (no change)
            return decimalUtility.new(0); // Default for additive bonuses is 0 (no change)
        }

        let aggregatedValue;

        if (effectType.includes('MULTIPLIER')) {
            aggregatedValue = decimalUtility.new(1);
            for (const sourceIdKey in sourcesForEffectKey) { // Iterate over the sources for this specific effect key
                const effectDetails = sourcesForEffectKey[sourceIdKey];
                try {
                    const value = effectDetails.valueProvider(); // Should return Decimal, e.g., Decimal(1.2) for a 20% mult
                    aggregatedValue = decimalUtility.multiply(aggregatedValue, value);
                } catch (error) {
                    loggingSystem.error("CoreUpgradeManager_GetAggregated", `Error in valueProvider for ${sourceIdKey} (effectKey: ${effectKey})`, error);
                }
            }
        } else if (effectType === 'ADDITIVE_BONUS' || effectType === 'PERCENTAGE_BONUS') { 
            aggregatedValue = decimalUtility.new(0);
            for (const sourceIdKey in sourcesForEffectKey) {
                const effectDetails = sourcesForEffectKey[sourceIdKey];
                 try {
                    const value = effectDetails.valueProvider(); // Should return Decimal, e.g., Decimal(10) for +10 bonus
                    aggregatedValue = decimalUtility.add(aggregatedValue, value);
                } catch (error) {
                    loggingSystem.error("CoreUpgradeManager_GetAggregated", `Error in valueProvider for ${sourceIdKey} (effectKey: ${effectKey})`, error);
                }
            }
        } else {
            loggingSystem.warn("CoreUpgradeManager_GetAggregated", `Unknown effectType for aggregation: ${effectType}. Returning default.`);
            return effectType.includes('MULTIPLIER') ? decimalUtility.new(1) : decimalUtility.new(0);
        }
        // loggingSystem.debug("CoreUpgradeManager_GetAggregated", `Final aggregated value for '${effectKey}': ${aggregatedValue.toString()}`);
        return aggregatedValue;
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
