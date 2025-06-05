// modules/studies_module/studies_logic.js (v3.1 - Debug)

/**
 * @file studies_logic.js
 * @description Contains the business logic for the Studies module.
 * v3.1: Added debug logs for coreSystemsRef.
 */

import { staticModuleData } from './studies_data.js';
import { moduleState } from './studies_state.js';

let coreSystemsRef = null; 

export const moduleLogic = {
    initialize(coreSystems) {
        coreSystemsRef = coreSystems;
        // --- Debug Log Added ---
        if (coreSystemsRef && coreSystemsRef.loggingSystem) {
            coreSystemsRef.loggingSystem.debug("StudiesLogic_Init", "coreSystemsRef received:", 
                Object.keys(coreSystemsRef), 
                "Has decimalUtility:", !!(coreSystemsRef.decimalUtility)
            );
        } else {
            console.error("StudiesLogic_Init: coreSystemsRef or loggingSystem is missing!", coreSystemsRef);
        }
        // --- End Debug Log ---
        coreSystemsRef.loggingSystem.info("StudiesLogic", "Logic initialized (v3.1).");
    },

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

        let currentCost = decimalUtility.multiply(
            baseCost,
            decimalUtility.power(costGrowthFactor, ownedCount)
        );

        const costReductionMultiplier = coreUpgradeManager.getCostReductionMultiplier('studies_producers', producerId);
        currentCost = decimalUtility.multiply(currentCost, costReductionMultiplier);
        
        if (decimalUtility.lt(currentCost, 1) && decimalUtility.neq(currentCost, 0)) {
            // currentCost = decimalUtility.new(1); 
        }
        return currentCost;
    },

    purchaseProducer(producerId) {
        if (!coreSystemsRef) {
            console.error("StudiesLogic: Core systems not initialized.");
            return false;
        }

        const { coreResourceManager, decimalUtility, loggingSystem, coreGameStateManager } = coreSystemsRef;
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

        if (producerId === 'professor' && decimalUtility.gt(totalProduction, 0)) {
            const knowledgeResourceState = coreResourceManager.getAllResources()['knowledge'];
            if (knowledgeResourceState && !knowledgeResourceState.isUnlocked) {
                coreResourceManager.unlockResource('knowledge');
                loggingSystem.info("StudiesLogic", "Knowledge resource production started, ensuring it's unlocked.");
            }
            if (knowledgeResourceState && !knowledgeResourceState.showInUI) {
                coreResourceManager.setResourceVisibility('knowledge', true);
                loggingSystem.info("StudiesLogic", "Knowledge resource made visible in UI.");
            }
        }
        // Removed verbose log from here for brevity, core functionality is key
    },

    updateAllProducerProductions() {
        // --- Debug Log Added ---
        if (!coreSystemsRef || typeof coreSystemsRef.decimalUtility === 'undefined') {
            const logger = coreSystemsRef ? coreSystemsRef.loggingSystem : console;
            logger.error("StudiesLogic_UpdateAll", "coreSystemsRef or decimalUtility is problematic before loop!", coreSystemsRef);
        }
        // --- End Debug Log ---
        const { decimalUtility } = coreSystemsRef; 
        for (const producerId in staticModuleData.producers) {
            if (this.isProducerUnlocked(producerId) || decimalUtility.gt(moduleState.ownedProducers[producerId] || "0", 0) ) { 
                 this.updateProducerProduction(producerId);
            }
        }
        if (coreSystemsRef && coreSystemsRef.loggingSystem) { // Check if loggingSystem is available
            coreSystemsRef.loggingSystem.debug("StudiesLogic", "All active producer productions updated.");
        }
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
        coreSystemsRef.loggingSystem.info("StudiesLogic", "onGameLoad (v3.1): Re-calculating all producer productions and flags.");
        this.updateAllProducerProductions();
        this.updateGlobalFlags();
        const knowledgeResourceState = coreSystemsRef.coreResourceManager.getAllResources()['knowledge'];
        if (knowledgeResourceState && (decimalUtility.gt(knowledgeResourceState.amount, 0) || decimalUtility.gt(knowledgeResourceState.totalProductionRate,0))) {
            if (!knowledgeResourceState.isUnlocked) coreSystemsRef.coreResourceManager.unlockResource('knowledge');
            if (!knowledgeResourceState.showInUI) coreSystemsRef.coreResourceManager.setResourceVisibility('knowledge', true);
        }
    },

    onResetState() {
        coreSystemsRef.loggingSystem.info("StudiesLogic", "onResetState (v3.1): Resetting Studies module logic state.");
        this.updateAllProducerProductions();
        const knowledgeDef = staticModuleData.resources.knowledge;
        coreSystemsRef.coreResourceManager.setResourceVisibility('knowledge', knowledgeDef.showInUI);
    }
};
