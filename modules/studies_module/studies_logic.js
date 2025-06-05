// modules/studies_module/studies_logic.js (v2)

/**
 * @file studies_logic.js
 * @description Contains the business logic for the Studies module,
 * primarily handling producer purchases, cost calculations, and production updates.
 * Now integrates with CoreUpgradeManager for modifiers.
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
        coreSystemsRef.loggingSystem.info("StudiesLogic", "Logic initialized (v2 - with UpgradeManager integration).");
    },

    /**
     * Calculates the current cost of a producer, applying cost reduction modifiers.
     * Formula: baseCost * (costGrowthFactor ^ ownedCount) * costReductionMultiplier
     * @param {string} producerId - The ID of the producer.
     * @returns {Decimal} The current cost of the producer.
     */
    calculateProducerCost(producerId) {
        const { decimalUtility, loggingSystem, coreUpgradeManager } = coreSystemsRef;
        const producerDef = staticModuleData.producers[producerId];

        if (!producerDef) {
            loggingSystem.error("StudiesLogic", `Producer definition not found for ID: ${producerId}`);
            return decimalUtility.new(Infinity);
        }

        const baseCost = decimalUtility.new(producerDef.baseCost);
        const costGrowthFactor = decimalUtility.new(producerDef.costGrowthFactor);
        const ownedCount = decimalUtility.new(moduleState.ownedProducers[producerId] || 0);

        // Base cost calculation
        let currentCost = decimalUtility.multiply(
            baseCost,
            decimalUtility.power(costGrowthFactor, ownedCount)
        );

        // Apply cost reduction multipliers from CoreUpgradeManager
        const costReductionMultiplier = coreUpgradeManager.getCostReductionMultiplier('studies_producers', producerId);
        currentCost = decimalUtility.multiply(currentCost, costReductionMultiplier);
        
        if (decimalUtility.lt(currentCost, 1) && decimalUtility.neq(currentCost, 0)) {
             // currentCost = decimalUtility.new(1); // Example floor
        }

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

            let currentOwned = decimalUtility.new(moduleState.ownedProducers[producerId] || 0);
            moduleState.ownedProducers[producerId] = decimalUtility.add(currentOwned, 1).toString();

            this.updateProducerProduction(producerId);
            coreGameStateManager.setModuleState('studies', { ...moduleState });

            loggingSystem.info("StudiesLogic", `Purchased ${producerDef.name}. Cost: ${decimalUtility.format(cost)} ${costResource}. Owned: ${moduleState.ownedProducers[producerId]}`);
            
            return true;
        } else {
            loggingSystem.debug("StudiesLogic", `Cannot afford ${producerDef.name}. Need ${decimalUtility.format(cost)} ${costResource}. Have ${decimalUtility.format(coreResourceManager.getAmount(costResource))}`);
            return false;
        }
    },

    /**
     * Updates the total production rate for a specific producer type, applying multipliers.
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
        let totalProduction = decimalUtility.multiply(baseProductionPerUnit, ownedCount);

        const productionMultiplier = coreUpgradeManager.getProductionMultiplier('studies_producers', producerId);
        totalProduction = decimalUtility.multiply(totalProduction, productionMultiplier);
        
        const globalResourceMultiplier = coreUpgradeManager.getProductionMultiplier('global_resource_production', producerDef.resourceId);
        totalProduction = decimalUtility.multiply(totalProduction, globalResourceMultiplier);

        const sourceKey = `studies_module_${producerId}`;
        coreResourceManager.setProductionPerSecond(producerDef.resourceId, sourceKey, totalProduction);

        loggingSystem.debug("StudiesLogic", `Updated production for ${producerDef.name} (${producerId}). Base: ${baseProductionPerUnit} * Own: ${ownedCount} * ProdMulti: ${productionMultiplier} * GlobalResMulti: ${globalResourceMultiplier} = Total: ${decimalUtility.format(totalProduction)} ${producerDef.resourceId}/s`);
    },

    /**
     * Calculates and updates the production for all producers in the Studies module.
     */
    updateAllProducerProductions() {
        // Destructure decimalUtility here to make it available in this function's scope
        const { decimalUtility } = coreSystemsRef; 
        for (const producerId in staticModuleData.producers) {
            if (this.isProducerUnlocked(producerId) || decimalUtility.gt(moduleState.ownedProducers[producerId] || "0", 0) ) { 
                 this.updateProducerProduction(producerId);
            }
        }
        coreSystemsRef.loggingSystem.debug("StudiesLogic", "All active producer productions updated.");
    },

    isProducerUnlocked(producerId) {
        const { coreResourceManager, decimalUtility, loggingSystem } = coreSystemsRef;
        const producerDef = staticModuleData.producers[producerId];
        if (!producerDef || !producerDef.unlockCondition) return true;
        const condition = producerDef.unlockCondition;
        switch (condition.type) {
            case "resource":
                return decimalUtility.gte(coreResourceManager.getAmount(condition.resourceId), decimalUtility.new(condition.amount));
            case "producerOwned":
                return decimalUtility.gte(decimalUtility.new(moduleState.ownedProducers[condition.producerId] || 0), decimalUtility.new(condition.count));
            default:
                loggingSystem.warn("StudiesLogic", `Unknown unlock condition type for producer ${producerId}: ${condition.type}`);
                return false;
        }
    },

    getOwnedProducerCount(producerId) {
        const { decimalUtility } = coreSystemsRef;
        return decimalUtility.new(moduleState.ownedProducers[producerId] || 0);
    },

    isStudiesTabUnlocked() {
        const { coreResourceManager, decimalUtility } = coreSystemsRef;
        const condition = staticModuleData.ui.studiesTabUnlockCondition;
        if (!condition) return true;
        switch (condition.type) {
            case "resource":
                return decimalUtility.gte(coreResourceManager.getAmount(condition.resourceId), decimalUtility.new(condition.amount));
            default:
                return false;
        }
    },

    updateGlobalFlags() {
        const { coreGameStateManager, loggingSystem, decimalUtility, coreUIManager } = coreSystemsRef;
        for (const flagKey in staticModuleData.globalFlagsToSet) {
            const flagDef = staticModuleData.globalFlagsToSet[flagKey];
            const condition = flagDef.condition;
            let conditionMet = false;
            switch (condition.type) {
                case "producerOwned":
                    conditionMet = decimalUtility.gte(decimalUtility.new(moduleState.ownedProducers[condition.producerId] || 0), decimalUtility.new(condition.count));
                    break;
                default:
                    loggingSystem.warn("StudiesLogic", `Unknown global flag condition type: ${condition.type}`);
                    break;
            }
            if (conditionMet && !coreGameStateManager.getGlobalFlag(flagDef.flag)) {
                coreGameStateManager.setGlobalFlag(flagDef.flag, flagDef.value);
                loggingSystem.info("StudiesLogic", `Global flag '${flagDef.flag}' set to ${flagDef.value}.`);
                coreUIManager.showNotification(`New feature unlocked via Studies progress! Check the menu.`, 'info', 3000);
                coreUIManager.renderMenu();
            }
        }
    },

    onGameLoad() {
        coreSystemsRef.loggingSystem.info("StudiesLogic", "onGameLoad (v2): Re-calculating all producer productions and flags.");
        this.updateAllProducerProductions();
        this.updateGlobalFlags();
    },

    onResetState() {
        coreSystemsRef.loggingSystem.info("StudiesLogic", "onResetState (v2): Resetting Studies module logic state.");
        this.updateAllProducerProductions();
    }
};
