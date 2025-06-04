// js/modules/studies_module/studies_logic.js (v3)

/**
 * @file studies_logic.js
 * @description Contains the business logic for the Studies module,
 * primarily handling producer purchases, cost calculations, and production updates.
 */

import { staticModuleData } from './studies_data.js';
import { moduleState } from './studies_state.js';

let coreSystemsRef = null; // To store references to core game systems

export const moduleLogic = {
    /**
     * Initializes the logic component with core system references.
     * @param {object} coreSystems - References to core game systems.
     */
    initialize(coreSystems) {
        coreSystemsRef = coreSystems;
        coreSystemsRef.loggingSystem.debug("StudiesLogic", "Logic initialized.");
    },

    /**
     * Calculates the current cost of a producer.
     * Formula: baseCost * (costGrowthFactor ^ ownedCount)
     * @param {string} producerId - The ID of the producer.
     * @returns {Decimal} The current cost of the producer.
     */
    calculateProducerCost(producerId) {
        const { decimalUtility, loggingSystem, coreUpgradeManager } = coreSystemsRef;
        const producerDef = staticModuleData.producers[producerId];

        if (!producerDef) {
            loggingSystem.error("StudiesLogic", `Producer definition not found for ID: ${producerId}`);
            return decimalUtility.new(Infinity); // Return a very high cost if not found
        }

        const baseCost = decimalUtility.new(producerDef.baseCost);
        const costGrowthFactor = decimalUtility.new(producerDef.costGrowthFactor);
        const ownedCount = decimalUtility.new(moduleState.ownedProducers[producerId] || 0);

        // Apply cost reduction modifiers from CoreUpgradeManager
        const costReductionFactor = coreUpgradeManager.getAggregatedModifier('producer', 'costReduction', producerId);
        // Cost = baseCost * (costGrowthFactor ^ ownedCount) * costReductionFactor
        // Note: costReductionFactor is (1 - sumOfReductions), so multiplying by it reduces the cost.
        let currentCost = decimalUtility.multiply(
            baseCost,
            decimalUtility.power(costGrowthFactor, ownedCount)
        );
        currentCost = decimalUtility.multiply(currentCost, costReductionFactor);


        return currentCost;
    },

    /**
     * Handles the purchase of a producer.
     * @param {string} producerId - The ID of the producer to purchase.
     * @returns {boolean} True if purchase was successful, false otherwise.
     */
    purchaseProducer(producerId) {
        if (!coreSystemsRef) {
            console.error("StudiesLogic: Core systems not initialized.");
            return false;
        }

        const { coreResourceManager, decimalUtility, loggingSystem, coreGameStateManager, coreUIManager } = coreSystemsRef;
        const producerDef = staticModuleData.producers[producerId];

        if (!producerDef) {
            loggingSystem.error("StudiesLogic", `Attempted to purchase unknown producer: ${producerId}`);
            return false;
        }

        const cost = this.calculateProducerCost(producerId);
        const costResource = producerDef.costResource;

        if (coreResourceManager.canAfford(costResource, cost)) {
            coreResourceManager.spendAmount(costResource, cost);

            // Increment owned count for this producer
            let currentOwned = decimalUtility.new(moduleState.ownedProducers[producerId] || 0);
            moduleState.ownedProducers[producerId] = decimalUtility.add(currentOwned, 1).toString(); // Store as string for saving

            // If purchasing the first Professor, unlock the Knowledge resource in UI
            if (producerId === 'professor' && decimalUtility.eq(currentOwned, 0)) {
                coreResourceManager.unlockResource('knowledge');
                coreResourceManager.setResourceVisibility('knowledge', true);
                loggingSystem.info("StudiesLogic", "Knowledge resource unlocked and set to show in UI.");
                coreUIManager.showNotification("New Resource Unlocked: Knowledge!", 'info', 3000);
            }

            // Update total production rate for the resource this producer generates
            this.updateProducerProduction(producerId);

            // Persist the updated module state to the global game state
            coreGameStateManager.setModuleState('studies', { ...moduleState });

            loggingSystem.info("StudiesLogic", `Purchased ${producerDef.name}. Cost: ${decimalUtility.format(cost)} ${costResource}. Owned: ${moduleState.ownedProducers[producerId]}`);
            return true;
        } else {
            loggingSystem.debug("StudiesLogic", `Cannot afford ${producerDef.name}. Need ${decimalUtility.format(cost)} ${costResource}. Have ${decimalUtility.format(coreResourceManager.getAmount(costResource))}`);
            return false;
        }
    },

    /**
     * Updates the total production rate for a specific producer type.
     * This method should be called after purchasing a producer or when production bonuses change.
     * @param {string} producerId - The ID of the producer (e.g., 'student').
     */
    updateProducerProduction(producerId) {
        const { coreResourceManager, decimalUtility, loggingSystem, coreUpgradeManager } = coreSystemsRef;
        const producerDef = staticModuleData.producers[producerId];

        if (!producerDef) {
            loggingSystem.error("StudiesLogic", `Producer definition not found for ID: ${producerId} during production update.`);
            return;
        }

        const ownedCount = decimalUtility.new(moduleState.ownedProducers[producerId] || 0);
        const baseProductionPerUnit = decimalUtility.new(producerDef.baseProduction);

        // Calculate total production from this type of producer
        let totalProduction = decimalUtility.multiply(baseProductionPerUnit, ownedCount);

        // Apply production multipliers from CoreUpgradeManager
        // Check for specific producer multipliers (e.g., skill for student)
        const producerMultiplier = coreUpgradeManager.getAggregatedModifier('producer', 'productionMultiplier', producerId);
        totalProduction = decimalUtility.multiply(totalProduction, producerMultiplier);

        // Check for global resource multipliers (e.g., achievement for studyPoints)
        if (producerDef.resourceId === 'studyPoints') {
            const globalSPMultiplier = coreUpgradeManager.getAggregatedModifier('resource', 'productionMultiplier', 'studyPoints');
            totalProduction = decimalUtility.multiply(totalProduction, globalSPMultiplier);
        }
        // Add other resource-specific global multipliers here if needed (e.g., for 'knowledge')
        if (producerDef.resourceId === 'knowledge') {
             const globalKnowledgeMultiplier = coreUpgradeManager.getAggregatedModifier('resource', 'productionMultiplier', 'knowledge');
             totalProduction = decimalUtility.multiply(totalProduction, globalKnowledgeMultiplier);
        }


        // Set this producer's contribution to the resource manager
        // The sourceKey should be unique for this module and producer type
        const sourceKey = `studies_module_${producerId}`;
        coreResourceManager.setProductionPerSecond(producerDef.resourceId, sourceKey, totalProduction);

        loggingSystem.debug("StudiesLogic", `Updated production for ${producerDef.name} (${producerId}). Total: ${decimalUtility.format(totalProduction)} ${producerDef.resourceId}/s`);
    },

    /**
     * Calculates and updates the production for all producers in the Studies module.
     * This should be called on game load and potentially periodically if external multipliers change.
     */
    updateAllProducerProductions() {
        for (const producerId in staticModuleData.producers) {
            this.updateProducerProduction(producerId);
        }
        coreSystemsRef.loggingSystem.debug("StudiesLogic", "All producer productions updated.");
    },

    /**
     * Checks if a producer is unlocked based on its unlock condition.
     * @param {string} producerId - The ID of the producer.
     * @returns {boolean} True if unlocked, false otherwise.
     */
    isProducerUnlocked(producerId) {
        const { coreResourceManager, decimalUtility, loggingSystem, moduleLoader } = coreSystemsRef;
        const producerDef = staticModuleData.producers[producerId];

        if (!producerDef || !producerDef.unlockCondition) {
            // If no unlock condition, assume it's unlocked by default
            return true;
        }

        const condition = producerDef.unlockCondition;

        switch (condition.type) {
            case "resource":
                const currentResourceAmount = coreResourceManager.getAmount(condition.resourceId);
                const requiredResourceAmount = decimalUtility.new(condition.amount);
                return decimalUtility.gte(currentResourceAmount, requiredResourceAmount);
            case "producerOwned":
                // For producerOwned conditions, check against this module's state
                const ownedCount = decimalUtility.new(moduleState.ownedProducers[condition.producerId] || 0);
                const requiredCount = decimalUtility.new(condition.count);
                return decimalUtility.gte(ownedCount, requiredCount);
            case "globalFlag":
                return coreSystemsRef.coreGameStateManager.getGlobalFlag(condition.flag) === condition.value;
            default:
                loggingSystem.warn("StudiesLogic", `Unknown unlock condition type for producer ${producerId}: ${condition.type}`);
                return false;
        }
    },

    /**
     * Gets the current owned count for a specific producer.
     * @param {string} producerId - The ID of the producer.
     * @returns {Decimal} The owned count as a Decimal.
     */
    getOwnedProducerCount(producerId) {
        const { decimalUtility } = coreSystemsRef;
        return decimalUtility.new(moduleState.ownedProducers[producerId] || 0);
    },

    /**
     * Checks if the Studies tab itself should be unlocked.
     * @returns {boolean}
     */
    isStudiesTabUnlocked() {
        const { coreResourceManager, decimalUtility } = coreSystemsRef;
        const condition = staticModuleData.ui.studiesTabUnlockCondition;

        if (!condition) {
            return true; // Always unlocked if no condition defined
        }

        switch (condition.type) {
            case "resource":
                const currentResourceAmount = coreResourceManager.getAmount(condition.resourceId);
                const requiredResourceAmount = decimalUtility.new(condition.amount);
                return decimalUtility.gte(currentResourceAmount, requiredResourceAmount);
            default:
                return false;
        }
    },

    /**
     * Checks and updates global flags based on module progress.
     * This should be called periodically (e.g., in game loop or after significant actions).
     */
    updateGlobalFlags() {
        const { coreGameStateManager, loggingSystem, decimalUtility, coreUIManager } = coreSystemsRef;

        for (const flagKey in staticModuleData.globalFlagsToSet) {
            const flagDef = staticModuleData.globalFlagsToSet[flagKey];
            const condition = flagDef.condition;

            let conditionMet = false;
            switch (condition.type) {
                case "producerOwned":
                    const ownedCount = decimalUtility.new(moduleState.ownedProducers[condition.producerId] || 0);
                    const requiredCount = decimalUtility.new(condition.count);
                    conditionMet = decimalUtility.gte(ownedCount, requiredCount);
                    break;
                default:
                    loggingSystem.warn("StudiesLogic", `Unknown global flag condition type: ${condition.type}`);
                    break;
            }

            if (conditionMet && !coreGameStateManager.getGlobalFlag(flagDef.flag)) {
                coreGameStateManager.setGlobalFlag(flagDef.flag, flagDef.value);
                loggingSystem.info("StudiesLogic", `Global flag '${flagDef.flag}' set to ${flagDef.value} due to condition met.`);
                coreUIManager.showNotification(`New content unlocked: ${flagDef.flag}!`, 'info', 3000);
                coreUIManager.renderMenu(); // Trigger menu re-render to show new tabs
            }
        }
    },

    /**
     * Lifecycle method called when the game loads.
     * Ensures all production rates are correctly set based on loaded state.
     */
    onGameLoad() {
        coreSystemsRef.loggingSystem.info("StudiesLogic", "onGameLoad: Re-calculating all producer productions.");
        this.updateAllProducerProductions();
        this.updateGlobalFlags(); // Check flags on load too
    },

    /**
     * Lifecycle method called when the game resets.
     * Resets module-specific state.
     */
    onResetState() {
        coreSystemsRef.loggingSystem.info("StudiesLogic", "onResetState: Resetting Studies module logic state.");
        // When the game resets, the moduleState will be re-initialized by the manifest,
        // so we just need to ensure production rates are reset/recalculated.
        this.updateAllProducerProductions();
    }
};
