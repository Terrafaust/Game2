// modules/studies_module/studies_logic.js (v5.0 - Refactored)
// Uses centralized decimalUtility for calculations.
// Production calculation is now delegated to productionManager.

import { staticModuleData } from './studies_data.js';
import { moduleState } from './studies_state.js';
import { RESOURCES, UPGRADE_TARGETS, GLOBAL_FLAGS } from '../../core/constants.js';

let coreSystemsRef = null; 

export const moduleLogic = {
    initialize(coreSystems) {
        coreSystemsRef = coreSystems;
        coreSystemsRef.loggingSystem.info("StudiesLogic", "Logic initialized (v5.0).");
    },
    
    // REFACTORED: Uses decimalUtility for calculation
    calculateProducerCost(producerId, quantity = 1) {
        const { decimalUtility, coreUpgradeManager } = coreSystemsRef;
        const producerDef = staticModuleData.producers[producerId];
        if (!producerDef) return decimalUtility.new(Infinity);

        let n = decimalUtility.new(quantity);
        if (quantity === -1) {
             n = this.calculateMaxBuyable(producerId);
             if (decimalUtility.eq(n, 0)) return decimalUtility.new(Infinity);
        }

        const baseCost = decimalUtility.new(producerDef.baseCost);
        const growthFactor = decimalUtility.new(producerDef.costGrowthFactor);
        const ownedCount = this.getOwnedProducerCount(producerId);
        
        const costReductionMultiplier = coreUpgradeManager.getCostReductionMultiplier(UPGRADE_TARGETS.STUDIES_PRODUCERS, producerId);
        const effectiveBaseCost = decimalUtility.multiply(baseCost, costReductionMultiplier);

        return decimalUtility.getGeometricSeriesCost(effectiveBaseCost, growthFactor, ownedCount, n);
    },

    // REFACTORED: Uses decimalUtility for calculation
    calculateMaxBuyable(producerId) {
        const { decimalUtility, coreResourceManager, coreUpgradeManager } = coreSystemsRef;
        const producerDef = staticModuleData.producers[producerId];
        if (!producerDef) return decimalUtility.ZERO;
        
        const availableCurrency = coreResourceManager.getAmount(producerDef.costResource);
        const baseCost = decimalUtility.new(producerDef.baseCost);
        const growthFactor = decimalUtility.new(producerDef.costGrowthFactor);
        const ownedCount = this.getOwnedProducerCount(producerId);

        const costReductionMultiplier = coreUpgradeManager.getCostReductionMultiplier(UPGRADE_TARGETS.STUDIES_PRODUCERS, producerId);
        const effectiveBaseCost = decimalUtility.multiply(baseCost, costReductionMultiplier);

        return decimalUtility.getMaxBuyableGeometric(availableCurrency, effectiveBaseCost, growthFactor, ownedCount);
    },

    // REFACTORED: Calls productionManager instead of calculating internally
    purchaseProducer(producerId) {
        const { coreResourceManager, decimalUtility, loggingSystem, coreGameStateManager, buyMultiplierManager, productionManager } = coreSystemsRef;
        const producerDef = staticModuleData.producers[producerId];
        if (!producerDef) return false;

        let quantity = buyMultiplierManager.getMultiplier();
        if (quantity === -1) {
            quantity = this.calculateMaxBuyable(producerId);
            if (decimalUtility.lte(quantity, 0)) return false;
        }

        const cost = this.calculateProducerCost(producerId, quantity);
        if (coreResourceManager.canAfford(producerDef.costResource, cost)) {
            coreResourceManager.spendAmount(producerDef.costResource, cost);

            let currentOwned = this.getOwnedProducerCount(producerId);
            moduleState.ownedProducers[producerId] = decimalUtility.add(currentOwned, quantity).toString();
            coreGameStateManager.setModuleState('studies', { ...moduleState });

            // Delegate production recalculation to the central manager
            productionManager.recalculateTotalProduction(RESOURCES.STUDY_POINTS);
            if (producerDef.resourceId === RESOURCES.KNOWLEDGE) {
                productionManager.recalculateTotalProduction(RESOURCES.KNOWLEDGE);
            }

            loggingSystem.info("StudiesLogic", `Purchased ${decimalUtility.format(quantity,0)} of ${producerDef.name}.`);
            return true;
        }
        return false;
    },
    
    // REFACTORED: Calls productionManager after adding producers
    addProducers(producersToAdd) {
        const { decimalUtility, loggingSystem, coreGameStateManager, productionManager } = coreSystemsRef;
        let producersAdded = false;

        for (const producerId in producersToAdd) {
            const quantity = decimalUtility.new(producersToAdd[producerId]);
            if (decimalUtility.gt(quantity, 0)) {
                const currentOwned = this.getOwnedProducerCount(producerId);
                moduleState.ownedProducers[producerId] = decimalUtility.add(currentOwned, quantity).toString();
                producersAdded = true;
                loggingSystem.info("StudiesLogic", `Passively added ${quantity.toString()} of ${producerId}.`);
            }
        }

        if (producersAdded) {
            productionManager.recalculateTotalProduction(RESOURCES.STUDY_POINTS);
            productionManager.recalculateTotalProduction(RESOURCES.KNOWLEDGE);
            coreGameStateManager.setModuleState('studies', { ...moduleState });
        }
    },

    // NEW: Provides data to the productionManager
    getAllProducersData() {
        const { decimalUtility } = coreSystemsRef;
        const producers = [];
        for (const producerId in staticModuleData.producers) {
            const producerDef = staticModuleData.producers[producerId];
            producers.push({
                id: producerId,
                resourceId: producerDef.resourceId,
                ownedCount: this.getOwnedProducerCount(producerId),
                baseProduction: decimalUtility.new(producerDef.baseProduction)
            });
        }
        return producers;
    },

    isProducerUnlocked(producerId) {
        const { coreResourceManager, decimalUtility } = coreSystemsRef;
        const producerDef = staticModuleData.producers[producerId];
        if (!producerDef || !producerDef.unlockCondition) return true;
        const condition = producerDef.unlockCondition;
        switch (condition.type) {
            case "resource":
                return decimalUtility.gte(coreResourceManager.getAmount(condition.resourceId), condition.amount);
            case "producerOwned":
                return decimalUtility.gte(this.getOwnedProducerCount(condition.producerId), condition.count);
            default: return false;
        }
    },

    getOwnedProducerCount(producerId) {
        return coreSystemsRef.decimalUtility.new(moduleState.ownedProducers[producerId] || 0);
    },

    isStudiesTabUnlocked() {
        const { coreResourceManager, decimalUtility, coreGameStateManager, coreUIManager } = coreSystemsRef;
        if (coreGameStateManager.getGlobalFlag(GLOBAL_FLAGS.STUDIES_TAB_UNLOCKED, false)) return true;
        
        const condition = staticModuleData.ui.studiesTabUnlockCondition;
        if (!condition) return true;

        if (condition.type === "resource" && decimalUtility.gte(coreResourceManager.getAmount(condition.resourceId), condition.amount)) {
            coreGameStateManager.setGlobalFlag(GLOBAL_FLAGS.STUDIES_TAB_UNLOCKED, true);
            if(coreUIManager) coreUIManager.renderMenu();
            return true;
        }
        return false;
    },

    updateGlobalFlags() {
        const { coreGameStateManager, loggingSystem, decimalUtility, coreUIManager } = coreSystemsRef;
        for (const flagKey in staticModuleData.globalFlagsToSet) {
            const flagDef = staticModuleData.globalFlagsToSet[flagKey];
            const condition = flagDef.condition;
            let conditionMet = false;
            if (condition.type === "producerOwned") {
                conditionMet = decimalUtility.gte(this.getOwnedProducerCount(condition.producerId), condition.count);
            }
            if (conditionMet && !coreGameStateManager.getGlobalFlag(flagDef.flag)) {
                coreGameStateManager.setGlobalFlag(flagDef.flag, flagDef.value);
                coreUIManager.showNotification(`New feature unlocked via Studies progress! Check the menu.`, 'info', 3000);
                coreUIManager.renderMenu();
            }
        }
    },

    onGameLoad() {
        const { productionManager, coreResourceManager, decimalUtility } = coreSystemsRef;
        productionManager.recalculateTotalProduction(RESOURCES.STUDY_POINTS);
        productionManager.recalculateTotalProduction(RESOURCES.KNOWLEDGE);
        this.updateGlobalFlags();
        this.isStudiesTabUnlocked(); 

        const knowledgeResourceState = coreResourceManager.getResource(RESOURCES.KNOWLEDGE);
        if (knowledgeResourceState && (decimalUtility.gt(knowledgeResourceState.amount, 0) || decimalUtility.gt(knowledgeResourceState.totalProductionRate,0))) {
            if (!knowledgeResourceState.isUnlocked) coreResourceManager.unlockResource(RESOURCES.KNOWLEDGE);
            if (!knowledgeResourceState.showInUI) coreResourceManager.setResourceVisibility(RESOURCES.KNOWLEDGE, true);
        }
    },
    
    onResetState() {
        const { coreResourceManager, coreGameStateManager, productionManager } = coreSystemsRef;
        productionManager.recalculateTotalProduction(RESOURCES.STUDY_POINTS);
        productionManager.recalculateTotalProduction(RESOURCES.KNOWLEDGE);
        const knowledgeDef = staticModuleData.resources.knowledge;
        coreResourceManager.setResourceVisibility(RESOURCES.KNOWLEDGE, knowledgeDef.showInUI);
        coreGameStateManager.setGlobalFlag(GLOBAL_FLAGS.STUDIES_TAB_UNLOCKED, false);
    },
    onPrestigeReset() {
        // State is reset by the manifest, we just need to update production
        const { productionManager } = coreSystemsRef;
        productionManager.recalculateTotalProduction(RESOURCES.STUDY_POINTS);
        productionManager.recalculateTotalProduction(RESOURCES.KNOWLEDGE);
    }
};
