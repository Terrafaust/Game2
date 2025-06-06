// modules/studies_module/studies_logic.js (v3.5 - Buy Multiplier)

/**
 * @file studies_logic.js
 * @description Contains the business logic for the Studies module.
 * v3.5: Implements buy multiplier for purchasing producers.
 * v3.4: Ensures 'studiesTabPermanentlyUnlocked' flag is cleared on reset.
 */

import { staticModuleData } from './studies_data.js';
import { moduleState } from './studies_state.js';

let coreSystemsRef = null; 

export const moduleLogic = {
    initialize(coreSystems) {
        coreSystemsRef = coreSystems;
        coreSystemsRef.loggingSystem.info("StudiesLogic", "Logic initialized (v3.5).");
    },

    calculateProducerCost(producerId, quantity = 1) {
        const { decimalUtility, loggingSystem, coreUpgradeManager } = coreSystemsRef;
        const producerDef = staticModuleData.producers[producerId];

        if (!producerDef) {
            loggingSystem.error("StudiesLogic", `Producer definition not found for ID: ${producerId}`);
            return decimalUtility.new(Infinity);
        }

        const baseCost = decimalUtility.new(producerDef.baseCost);
        const costGrowthFactor = decimalUtility.new(producerDef.costGrowthFactor);
        const ownedCount = decimalUtility.new(moduleState.ownedProducers[producerId] || 0);
        const n = decimalUtility.new(quantity);

        let totalCost;
        if (decimalUtility.eq(costGrowthFactor, 1)) {
            totalCost = decimalUtility.multiply(baseCost, n);
        } else {
            const R_pow_n = decimalUtility.power(costGrowthFactor, n);
            const numerator = decimalUtility.subtract(R_pow_n, 1);
            const denominator = decimalUtility.subtract(costGrowthFactor, 1);
            totalCost = decimalUtility.multiply(baseCost, decimalUtility.divide(numerator, denominator));
        }
        
        const priceIncreaseFromOwned = decimalUtility.power(costGrowthFactor, ownedCount);
        totalCost = decimalUtility.multiply(totalCost, priceIncreaseFromOwned);

        const costReductionMultiplier = coreUpgradeManager.getCostReductionMultiplier('studies_producers', producerId);
        totalCost = decimalUtility.multiply(totalCost, costReductionMultiplier);
        
        return totalCost;
    },

    purchaseProducer(producerId) {
        const { coreResourceManager, decimalUtility, loggingSystem, coreGameStateManager, buyMultiplierManager } = coreSystemsRef;
        const producerDef = staticModuleData.producers[producerId];

        if (!producerDef) {
            loggingSystem.error("StudiesLogic", `Attempted to purchase unknown producer: ${producerId}`);
            return false;
        }

        const quantity = buyMultiplierManager.getMultiplier();
        const cost = this.calculateProducerCost(producerId, quantity);
        const costResource = producerDef.costResource;

        if (coreResourceManager.canAfford(costResource, cost)) {
            coreResourceManager.spendAmount(costResource, cost);

            let currentOwned = decimalUtility.new(moduleState.ownedProducers[producerId] || 0);
            moduleState.ownedProducers[producerId] = decimalUtility.add(currentOwned, quantity).toString();

            this.updateProducerProduction(producerId);
            coreGameStateManager.setModuleState('studies', { ...moduleState });

            loggingSystem.info("StudiesLogic", `Purchased ${quantity} of ${producerDef.name}. Cost: ${decimalUtility.format(cost)} ${costResource}. Owned: ${moduleState.ownedProducers[producerId]}`);
            return true;
        } else {
            loggingSystem.debug("StudiesLogic", `Cannot afford ${quantity} of ${producerDef.name}. Need ${decimalUtility.format(cost)} ${costResource}. Have ${decimalUtility.format(coreResourceManager.getAmount(costResource))}`);
            return false;
        }
    },
    
    // ... all other functions from your original file remain untouched ...

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

    isStudiesTabUnlocked() {
        if (!coreSystemsRef || !coreSystemsRef.coreResourceManager || !coreSystemsRef.decimalUtility || !coreSystemsRef.coreGameStateManager) {
            console.error("StudiesLogic_isStudiesTabUnlocked_CRITICAL: Core systems missing!", coreSystemsRef);
            return true; 
        }
        const { coreResourceManager, decimalUtility, coreGameStateManager, coreUIManager } = coreSystemsRef;

        if (coreGameStateManager.getGlobalFlag('studiesTabPermanentlyUnlocked', false)) {
            return true;
        }

        const condition = staticModuleData.ui.studiesTabUnlockCondition;
        if (!condition) { 
             coreGameStateManager.setGlobalFlag('studiesTabPermanentlyUnlocked', true); 
             if(coreUIManager) coreUIManager.renderMenu(); 
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
            if(coreUIManager) coreUIManager.renderMenu();
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
        coreSystemsRef.loggingSystem.info("StudiesLogic", "onGameLoad (v3.4): Re-calculating all producer productions and flags.");
        this.updateAllProducerProductions();
        this.updateGlobalFlags();
        this.isStudiesTabUnlocked(); 
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
        coreSystemsRef.loggingSystem.info("StudiesLogic", "onResetState (v3.4): Resetting Studies module logic state.");
        this.updateAllProducerProductions();
        const knowledgeDef = staticModuleData.resources.knowledge;
        coreSystemsRef.coreResourceManager.setResourceVisibility('knowledge', knowledgeDef.showInUI);
        coreSystemsRef.coreGameStateManager.setGlobalFlag('studiesTabPermanentlyUnlocked', false);
        coreSystemsRef.loggingSystem.info("StudiesLogic", "'studiesTabPermanentlyUnlocked' flag cleared.");
    }
};
