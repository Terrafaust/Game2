// modules/studies_module/studies_logic.js (v3.6 - Buy Max)

/**
 * @file studies_logic.js
 * @description Contains the business logic for the Studies module.
 * v3.6: Implements 'Buy Max' functionality.
 * v3.5: Implements buy multiplier for purchasing producers.
 */

import { staticModuleData } from './studies_data.js';
import { moduleState } from './studies_state.js';

let coreSystemsRef = null; 

export const moduleLogic = {
    initialize(coreSystems) {
        coreSystemsRef = coreSystems;
        coreSystemsRef.loggingSystem.info("StudiesLogic", "Logic initialized (v3.6).");
    },
    
    calculateMaxBuyable(producerId) {
        const { coreResourceManager, decimalUtility, coreUpgradeManager } = coreSystemsRef;
        const producerDef = staticModuleData.producers[producerId];
        if (!producerDef) return decimalUtility.ZERO;

        const ownedCount = this.getOwnedProducerCount(producerId);
        const costResource = producerDef.costResource;
        const currentResources = coreResourceManager.getAmount(costResource);

        const baseCost = decimalUtility.new(producerDef.baseCost);
        const costGrowthFactor = decimalUtility.new(producerDef.costGrowthFactor);
        const costReductionMultiplier = coreUpgradeManager.getCostReductionMultiplier('studies_producers', producerId);
        
        const effectiveBaseCost = decimalUtility.multiply(baseCost, costReductionMultiplier);
        if (decimalUtility.lte(effectiveBaseCost, 0)) return decimalUtility.new(Infinity); // Avoid division by zero

        // Simplified check for first purchase
        if (decimalUtility.lt(currentResources, effectiveBaseCost)) {
            return decimalUtility.ZERO;
        }

        // Reverse the geometric series formula to solve for n (quantity)
        // C_total = C_base * R_owned * (R^n - 1) / (R - 1)
        // ((C_total * (R-1)) / (C_base * R_owned)) + 1 = R^n
        // n = log_R (LHS) = log(LHS) / log(R)
        
        const R = costGrowthFactor;
        const R_minus_1 = decimalUtility.subtract(R, 1);
        const C_base_eff_pow_owned = decimalUtility.multiply(effectiveBaseCost, decimalUtility.power(R, ownedCount));

        if (decimalUtility.lte(C_base_eff_pow_owned, 0)) return decimalUtility.new(Infinity);

        const term = decimalUtility.divide(decimalUtility.multiply(currentResources, R_minus_1), C_base_eff_pow_owned);
        const LHS = decimalUtility.add(term, 1);
        
        if (decimalUtility.lte(LHS, 1)) return decimalUtility.ZERO;

        const log_LHS = decimalUtility.ln(LHS);
        const log_R = decimalUtility.ln(R);

        if (decimalUtility.lte(log_R, 0)) return decimalUtility.ZERO; // Growth factor must be > 1

        const max_n = decimalUtility.floor(decimalUtility.divide(log_LHS, log_R));
        
        return decimalUtility.max(max_n, 0); // Ensure it's not negative
    },

    calculateProducerCost(producerId, quantity = 1) {
        const { decimalUtility, coreUpgradeManager } = coreSystemsRef;
        const producerDef = staticModuleData.producers[producerId];

        if (!producerDef) return decimalUtility.new(Infinity);
        
        let n = decimalUtility.new(quantity);
        // Handle "Max" case
        if (quantity === -1) {
             n = this.calculateMaxBuyable(producerId);
             if (decimalUtility.eq(n, 0)) return decimalUtility.new(Infinity); // Can't buy any, cost is effectively infinite
        }


        const baseCost = decimalUtility.new(producerDef.baseCost);
        const costGrowthFactor = decimalUtility.new(producerDef.costGrowthFactor);
        const ownedCount = this.getOwnedProducerCount(producerId);
        
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

        if (!producerDef) return false;

        let quantity = buyMultiplierManager.getMultiplier();
        if (quantity === -1) { // -1 represents Max
            quantity = this.calculateMaxBuyable(producerId);
            if (decimalUtility.lte(quantity, 0)) {
                 loggingSystem.debug("StudiesLogic", `Buy Max for ${producerDef.name} calculated 0, purchase aborted.`);
                 return false;
            }
        }

        const cost = this.calculateProducerCost(producerId, quantity.toNumber());
        const costResource = producerDef.costResource;

        if (coreResourceManager.canAfford(costResource, cost)) {
            coreResourceManager.spendAmount(costResource, cost);

            let currentOwned = this.getOwnedProducerCount(producerId);
            moduleState.ownedProducers[producerId] = decimalUtility.add(currentOwned, quantity).toString();

            this.updateProducerProduction(producerId);
            coreGameStateManager.setModuleState('studies', { ...moduleState });

            loggingSystem.info("StudiesLogic", `Purchased ${decimalUtility.format(quantity,0)} of ${producerDef.name}.`);
            return true;
        } else {
            return false;
        }
    },

    // ... The rest of your 'studies_logic.js' file remains exactly the same.
    updateProducerProduction(producerId) {
        if (!coreSystemsRef || !coreSystemsRef.coreResourceManager || !coreSystemsRef.decimalUtility || !coreSystemsRef.loggingSystem || !coreSystemsRef.coreUpgradeManager) { return; }
        const { coreResourceManager, decimalUtility, loggingSystem, coreUpgradeManager } = coreSystemsRef;
        const producerDef = staticModuleData.producers[producerId];
        if (!producerDef) { return; }
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
            }
            if (knowledgeResourceState && !knowledgeResourceState.showInUI) {
                coreResourceManager.setResourceVisibility('knowledge', true);
            }
        }
    },
    updateAllProducerProductions() {
        if (!coreSystemsRef || typeof coreSystemsRef.decimalUtility === 'undefined') { return; }
        const { decimalUtility } = coreSystemsRef; 
        for (const producerId in staticModuleData.producers) {
            if (this.isProducerUnlocked(producerId) || decimalUtility.gt(moduleState.ownedProducers[producerId] || "0", 0) ) { 
                 this.updateProducerProduction(producerId);
            }
        }
    },
    isProducerUnlocked(producerId) {
        if (!coreSystemsRef || !coreSystemsRef.coreResourceManager) { return false; }
        const { coreResourceManager, decimalUtility } = coreSystemsRef;
        const producerDef = staticModuleData.producers[producerId];
        if (!producerDef || !producerDef.unlockCondition) return true;
        const condition = producerDef.unlockCondition;
        switch (condition.type) {
            case "resource":
                return decimalUtility.gte(coreResourceManager.getAmount(condition.resourceId), decimalUtility.new(condition.amount));
            case "producerOwned":
                return decimalUtility.gte(this.getOwnedProducerCount(condition.producerId), decimalUtility.new(condition.count));
            default:
                return false;
        }
    },
    getOwnedProducerCount(producerId) {
        if (!coreSystemsRef || !coreSystemsRef.decimalUtility) { return new Decimal(0); }
        const { decimalUtility } = coreSystemsRef;
        return decimalUtility.new(moduleState.ownedProducers[producerId] || 0);
    },
    isStudiesTabUnlocked() {
        if (!coreSystemsRef) { return true; }
        const { coreResourceManager, decimalUtility, coreGameStateManager, coreUIManager } = coreSystemsRef;
        if (coreGameStateManager.getGlobalFlag('studiesTabPermanentlyUnlocked', false)) { return true; }
        const condition = staticModuleData.ui.studiesTabUnlockCondition;
        if (!condition) { 
             coreGameStateManager.setGlobalFlag('studiesTabPermanentlyUnlocked', true); 
             if(coreUIManager) coreUIManager.renderMenu(); 
            return true;
        }
        let conditionMet = false;
        if (condition.type === "resource") {
            conditionMet = decimalUtility.gte(coreResourceManager.getAmount(condition.resourceId), decimalUtility.new(condition.amount));
        }
        if (conditionMet) {
            coreGameStateManager.setGlobalFlag('studiesTabPermanentlyUnlocked', true);
            if(coreUIManager) coreUIManager.renderMenu();
            return true;
        }
        return false;
    },
    updateGlobalFlags() {
        if (!coreSystemsRef) { return; }
        const { coreGameStateManager, loggingSystem, decimalUtility, coreUIManager } = coreSystemsRef;
        for (const flagKey in staticModuleData.globalFlagsToSet) {
            const flagDef = staticModuleData.globalFlagsToSet[flagKey];
            const condition = flagDef.condition;
            let conditionMet = false;
            if (condition.type === "producerOwned") {
                conditionMet = decimalUtility.gte(this.getOwnedProducerCount(condition.producerId), decimalUtility.new(condition.count));
            }
            if (conditionMet && !coreGameStateManager.getGlobalFlag(flagDef.flag)) {
                coreGameStateManager.setGlobalFlag(flagDef.flag, flagDef.value);
                coreUIManager.showNotification(`New feature unlocked via Studies progress! Check the menu.`, 'info', 3000);
                coreUIManager.renderMenu();
            }
        }
    },
    onGameLoad() {
        if (!coreSystemsRef) { return; }
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
        if (!coreSystemsRef) { return; }
        this.updateAllProducerProductions();
        const knowledgeDef = staticModuleData.resources.knowledge;
        coreSystemsRef.coreResourceManager.setResourceVisibility('knowledge', knowledgeDef.showInUI);
        coreSystemsRef.coreGameStateManager.setGlobalFlag('studiesTabPermanentlyUnlocked', false);
    }
};
