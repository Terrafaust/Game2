// modules/studies_module/studies_logic.js (v3.3 - Persistent Unlock)

/**
 * @file studies_logic.js
 * @description Contains the business logic for the Studies module.
 * v3.3: Implements persistent unlock for Studies tab via global flag.
 */

import { staticModuleData } from './studies_data.js';
import { moduleState } from './studies_state.js';

let coreSystemsRef = null; 

export const moduleLogic = {
    initialize(coreSystems) {
        coreSystemsRef = coreSystems;
        if (coreSystemsRef && coreSystemsRef.loggingSystem) {
            coreSystemsRef.loggingSystem.debug("StudiesLogic_Init", "coreSystemsRef received:", 
                Object.keys(coreSystemsRef), 
                "Has decimalUtility:", !!(coreSystemsRef.decimalUtility)
            );
            if (!coreSystemsRef.decimalUtility) {
                 coreSystemsRef.loggingSystem.error("StudiesLogic_Init_CRITICAL", "decimalUtility is MISSING in coreSystemsRef during initialize!");
            }
        } else {
            console.error("StudiesLogic_Init_CRITICAL: coreSystemsRef or loggingSystem is missing during initialize!", coreSystemsRef);
        }
        const log = (coreSystemsRef && coreSystemsRef.loggingSystem) ? coreSystemsRef.loggingSystem.info.bind(coreSystemsRef.loggingSystem) : console.log;
        log("StudiesLogic", "Logic initialized (v3.3).");
    },

    calculateProducerCost(producerId) {
        if (!coreSystemsRef || !coreSystemsRef.decimalUtility || !coreSystemsRef.loggingSystem || !coreSystemsRef.coreUpgradeManager) {
            console.error(`StudiesLogic_calculateProducerCost_CRITICAL: Core systems missing for producer ${producerId}!`, coreSystemsRef);
            if (!coreSystemsRef || !coreSystemsRef.decimalUtility) return new Decimal(Infinity); 
            return coreSystemsRef.decimalUtility.new(Infinity);
        }
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
        if (!coreSystemsRef || !coreSystemsRef.coreResourceManager || !coreSystemsRef.decimalUtility || !coreSystemsRef.loggingSystem || !coreSystemsRef.coreGameStateManager) {
            console.error("StudiesLogic_purchaseProducer_CRITICAL: Core systems missing!", coreSystemsRef);
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
        if (!coreSystemsRef || !coreSystemsRef.coreResourceManager || !coreSystemsRef.decimalUtility || !coreSystemsRef.loggingSystem || !coreSystemsRef.coreUpgradeManager) {
            console.error(`StudiesLogic_updateProducerProduction_CRITICAL: Core systems missing for producer ${producerId}!`, coreSystemsRef);
            return;
        }
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
    },

    updateAllProducerProductions() {
        if (!coreSystemsRef || typeof coreSystemsRef.decimalUtility === 'undefined') {
            const logger = (coreSystemsRef && coreSystemsRef.loggingSystem) ? coreSystemsRef.loggingSystem.error.bind(coreSystemsRef.loggingSystem) : console.error;
            logger("StudiesLogic_UpdateAll_CRITICAL", "coreSystemsRef or coreSystemsRef.decimalUtility is undefined right before loop in updateAllProducerProductions!", coreSystemsRef);
            return; 
        }
        const { decimalUtility } = coreSystemsRef; 
        for (const producerId in staticModuleData.producers) {
            if (this.isProducerUnlocked(producerId) || decimalUtility.gt(moduleState.ownedProducers[producerId] || "0", 0) ) { 
                 this.updateProducerProduction(producerId);
            }
        }
        if (coreSystemsRef && coreSystemsRef.loggingSystem) {
            coreSystemsRef.loggingSystem.debug("StudiesLogic", "All active producer productions updated.");
        }
    },

    isProducerUnlocked(producerId) {
        if (!coreSystemsRef || !coreSystemsRef.coreResourceManager || !coreSystemsRef.decimalUtility || !coreSystemsRef.loggingSystem) {
            console.error("StudiesLogic_isProducerUnlocked_CRITICAL: Core systems missing!", coreSystemsRef);
            return false; 
        }
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
        if (!coreSystemsRef || !coreSystemsRef.decimalUtility) {
            console.error("StudiesLogic_getOwnedProducerCount_CRITICAL: decimalUtility missing!", coreSystemsRef);
            return new Decimal(0); 
        }
        const { decimalUtility } = coreSystemsRef;
        return decimalUtility.new(moduleState.ownedProducers[producerId] || 0);
    },

    /**
     * Checks if the Studies tab itself should be unlocked.
     * Now also sets a permanent flag if unlocked.
     * @returns {boolean}
     */
    isStudiesTabUnlocked() {
        if (!coreSystemsRef || !coreSystemsRef.coreResourceManager || !coreSystemsRef.decimalUtility || !coreSystemsRef.coreGameStateManager) {
            console.error("StudiesLogic_isStudiesTabUnlocked_CRITICAL: Core systems missing!", coreSystemsRef);
            return true; 
        }
        const { coreResourceManager, decimalUtility, coreGameStateManager, coreUIManager } = coreSystemsRef;

        // Check for the permanent unlock flag first
        if (coreGameStateManager.getGlobalFlag('studiesTabPermanentlyUnlocked', false)) {
            return true;
        }

        const condition = staticModuleData.ui.studiesTabUnlockCondition;
        if (!condition) { // Should not happen if data is correct
             coreGameStateManager.setGlobalFlag('studiesTabPermanentlyUnlocked', true); // Unlock if no condition
             if(coreUIManager) coreUIManager.renderMenu(); // Update menu
            return true;
        }
        
        let conditionMet = false;
        switch (condition.type) {
            case "resource":
                conditionMet = decimalUtility.gte(coreResourceManager.getAmount(condition.resourceId), decimalUtility.new(condition.amount));
                break;
            default:
                conditionMet = false;
                break;
        }

        if (conditionMet) {
            coreGameStateManager.setGlobalFlag('studiesTabPermanentlyUnlocked', true);
            if(coreUIManager) coreUIManager.renderMenu(); // Update menu as it's now permanently unlocked
            coreSystemsRef.loggingSystem.info("StudiesLogic", "Studies tab permanently unlocked.");
            return true;
        }
        return false;
    },

    updateGlobalFlags() {
        if (!coreSystemsRef || !coreSystemsRef.coreGameStateManager || !coreSystemsRef.decimalUtility || !coreSystemsRef.loggingSystem || !coreSystemsRef.coreUIManager) {
            console.error("StudiesLogic_updateGlobalFlags_CRITICAL: Core systems missing!", coreSystemsRef);
            return;
        }
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
        if (!coreSystemsRef || !coreSystemsRef.loggingSystem || !coreSystemsRef.coreResourceManager || !coreSystemsRef.decimalUtility) {
             console.error("StudiesLogic_onGameLoad_CRITICAL: Core systems missing!", coreSystemsRef);
             return;
        }
        coreSystemsRef.loggingSystem.info("StudiesLogic", "onGameLoad (v3.3): Re-calculating all producer productions and flags.");
        this.updateAllProducerProductions();
        this.updateGlobalFlags();
        this.isStudiesTabUnlocked(); // Check and potentially set permanent flag on load
        const { coreResourceManager, decimalUtility } = coreSystemsRef; 
        const knowledgeResourceState = coreResourceManager.getAllResources()['knowledge'];
        if (knowledgeResourceState && (decimalUtility.gt(knowledgeResourceState.amount, 0) || decimalUtility.gt(knowledgeResourceState.totalProductionRate,0))) {
            if (!knowledgeResourceState.isUnlocked) coreResourceManager.unlockResource('knowledge');
            if (!knowledgeResourceState.showInUI) coreResourceManager.setResourceVisibility('knowledge', true);
        }
    },

    onResetState() {
        if (!coreSystemsRef || !coreSystemsRef.loggingSystem || !coreSystemsRef.coreResourceManager || !coreSystemsRef.coreGameStateManager) {
             console.error("StudiesLogic_onResetState_CRITICAL: Core systems missing!", coreSystemsRef);
             return;
        }
        coreSystemsRef.loggingSystem.info("StudiesLogic", "onResetState (v3.3): Resetting Studies module logic state.");
        this.updateAllProducerProductions();
        const knowledgeDef = staticModuleData.resources.knowledge;
        coreSystemsRef.coreResourceManager.setResourceVisibility('knowledge', knowledgeDef.showInUI);
        // Clear the permanent unlock flag for the studies tab on reset
        coreSystemsRef.coreGameStateManager.setGlobalFlag('studiesTabPermanentlyUnlocked', false);
    }
};
