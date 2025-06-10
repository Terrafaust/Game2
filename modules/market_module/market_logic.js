// modules/market_module/market_logic.js (v5.1 - Restored Consumables Logic)

/**
 * @file market_logic.js
 * @description Business logic for the Market module.
 * v5.1: Generalized purchase logic to handle both consumables and skill points.
 * v5.0: Complete refactor for roadmap. Automation logic removed, unlock/purchase logic updated.
 */

import { staticModuleData } from './market_data.js';
import { moduleState, getInitialState } from './market_state.js';

let coreSystemsRef = null;

// Helper to find a scalable item definition in either consumables or skillPoints
function _getScalableItemDef(itemId) {
    if (staticModuleData.consumables && staticModuleData.consumables[itemId]) {
        return staticModuleData.consumables[itemId];
    }
    if (staticModuleData.skillPoints && staticModuleData.skillPoints[itemId]) {
        return staticModuleData.skillPoints[itemId];
    }
    return null;
}

export const moduleLogic = {
    initialize(coreSystems) {
        coreSystemsRef = coreSystems;
        coreSystemsRef.loggingSystem.info("MarketLogic", "Logic initialized (v5.1).");
    },
    
    calculateMaxBuyable(itemId) {
        const { coreResourceManager, decimalUtility, coreUpgradeManager } = coreSystemsRef;
        const itemDef = _getScalableItemDef(itemId);
        if (!itemDef) return decimalUtility.ZERO;

        const purchaseCountKey = itemDef.benefitResource;
        const ownedCount = decimalUtility.new(moduleState.purchaseCounts[purchaseCountKey] || "0");
        const costResource = itemDef.costResource;
        
        const availableCurrency = coreResourceManager.getAmount(costResource);
        const baseCost = decimalUtility.new(itemDef.baseCost);
        
        const costReductionMultiplier = coreUpgradeManager.getCostReductionMultiplier('market_items', itemId);
        const effectiveBaseCost = decimalUtility.multiply(baseCost, costReductionMultiplier);
        
        let costGrowthFactor = decimalUtility.new(itemDef.costGrowthFactor);
        const growthReduction = coreUpgradeManager.getAggregatedModifiers('market_items', itemId, 'COST_GROWTH_REDUCTION');
        if(decimalUtility.gt(growthReduction, 1)) {
            const effectiveGrowthMultiplier = decimalUtility.subtract(1, growthReduction);
            costGrowthFactor = decimalUtility.add(1, decimalUtility.multiply(decimalUtility.subtract(costGrowthFactor, 1), effectiveGrowthMultiplier));
        }

        if (decimalUtility.lt(availableCurrency, effectiveBaseCost)) return decimalUtility.ZERO;
        
        const R = costGrowthFactor;
        const R_minus_1 = decimalUtility.subtract(R, 1);
        const C_base_pow_owned = decimalUtility.multiply(effectiveBaseCost, decimalUtility.power(R, ownedCount));
        if (decimalUtility.lte(C_base_pow_owned, 0)) return decimalUtility.new(Infinity);

        const term = decimalUtility.divide(decimalUtility.multiply(availableCurrency, R_minus_1), C_base_pow_owned);
        const LHS = decimalUtility.add(term, 1);
        if (decimalUtility.lte(LHS, 1)) return decimalUtility.ZERO;

        const log_LHS = decimalUtility.ln(LHS);
        const log_R = decimalUtility.ln(R);
        if (decimalUtility.lte(log_R, 0)) return decimalUtility.ZERO;
        
        const max_n = decimalUtility.floor(decimalUtility.divide(log_LHS, log_R));
        return decimalUtility.max(max_n, 0);
    },

    calculateScalableItemCost(itemId, quantity = 1) {
        const { decimalUtility, coreUpgradeManager } = coreSystemsRef;
        const itemDef = _getScalableItemDef(itemId);
        if (!itemDef) return decimalUtility.new(Infinity);
        
        let n = decimalUtility.new(quantity);
        if (quantity === -1) {
            n = this.calculateMaxBuyable(itemId);
            if (decimalUtility.eq(n, 0)) return decimalUtility.new(Infinity);
        }

        const baseCost = decimalUtility.new(itemDef.baseCost);
        
        const costReductionMultiplier = coreUpgradeManager.getCostReductionMultiplier('market_items', itemId);
        const effectiveBaseCost = decimalUtility.multiply(baseCost, costReductionMultiplier);

        let costGrowthFactor = decimalUtility.new(itemDef.costGrowthFactor);
        const growthReduction = coreUpgradeManager.getAggregatedModifiers('market_items', itemId, 'COST_GROWTH_REDUCTION');
        if(decimalUtility.lt(growthReduction, 1)) {
            const growthPart = decimalUtility.subtract(costGrowthFactor, 1);
            const reducedGrowthPart = decimalUtility.multiply(growthPart, growthReduction);
            costGrowthFactor = decimalUtility.add(1, reducedGrowthPart);
        }
        
        const purchaseCountKey = itemDef.benefitResource;
        const ownedCount = decimalUtility.new(moduleState.purchaseCounts[purchaseCountKey] || "0");
        let totalCost;

        if (decimalUtility.eq(costGrowthFactor, 1)) {
            totalCost = decimalUtility.multiply(effectiveBaseCost, n);
        } else {
            const R_pow_n = decimalUtility.power(costGrowthFactor, n);
            const numerator = decimalUtility.subtract(R_pow_n, 1);
            const denominator = decimalUtility.subtract(costGrowthFactor, 1);
            totalCost = decimalUtility.multiply(effectiveBaseCost, decimalUtility.divide(numerator, denominator));
        }

        const priceIncreaseFromOwned = decimalUtility.power(costGrowthFactor, ownedCount);
        totalCost = decimalUtility.multiply(totalCost, priceIncreaseFromOwned);

        return totalCost;
    },

    purchaseScalableItem(itemId) {
        const { coreResourceManager, decimalUtility, coreGameStateManager, coreUIManager, buyMultiplierManager, moduleLoader } = coreSystemsRef;
        const itemDef = _getScalableItemDef(itemId);
        if (!itemDef) return false;
        
        let quantity = buyMultiplierManager.getMultiplier();
        if (quantity === -1) {
            quantity = this.calculateMaxBuyable(itemId);
            if (decimalUtility.lte(quantity, 0)) {
                 coreUIManager.showNotification(`Cannot afford any ${itemDef.name.replace('Acquire ', '')}.`, 'warning');
                return false;
            }
        } else {
            quantity = decimalUtility.new(quantity);
        }

        const cost = this.calculateScalableItemCost(itemId, quantity);
        const costResource = itemDef.costResource;

        if (coreResourceManager.canAfford(costResource, cost)) {
            coreResourceManager.spendAmount(costResource, cost);
            
            // Unlock resource if it's the first time acquiring it
            const benefitResource = coreResourceManager.getResource(itemDef.benefitResource);
            if (benefitResource && !benefitResource.isUnlocked) coreResourceManager.unlockResource(itemDef.benefitResource, true);
            if (benefitResource && !benefitResource.showInUI) coreResourceManager.setResourceVisibility(itemDef.benefitResource, true);

            const benefitAmount = decimalUtility.multiply(itemDef.benefitAmountPerPurchase, quantity);
            coreResourceManager.addAmount(itemDef.benefitResource, benefitAmount);
            
            const purchaseCountKey = itemDef.benefitResource;
            let currentPurchaseCount = decimalUtility.new(moduleState.purchaseCounts[purchaseCountKey] || "0");
            moduleState.purchaseCounts[purchaseCountKey] = decimalUtility.add(currentPurchaseCount, quantity).toString();
            coreGameStateManager.setModuleState('market', { ...moduleState });
            
            coreUIManager.showNotification(`Acquired ${decimalUtility.format(benefitAmount,0)} ${itemDef.name.replace('Acquire ', '')}${decimalUtility.gt(quantity,1) ? 's' : ''}!`, 'success', 2000);
            
            // If it was a skill point, check if the skills tab should now be unlocked
            if (itemDef.benefitResource.toLowerCase().includes('skillpoint')) {
                const skillsModule = moduleLoader.getModule('skills');
                if (skillsModule?.logic?.isSkillsTabUnlocked) {
                     skillsModule.logic.isSkillsTabUnlocked(); 
                } else {
                     coreUIManager.renderMenu();
                }
            }
            return true;
        } else {
             coreUIManager.showNotification(`Not enough resources.`, 'error');
            return false;
        }
    },
    
    canAffordUnlock(unlockId) { 
        const { coreResourceManager, decimalUtility } = coreSystemsRef;
        const unlockDef = staticModuleData.featureUnlocks[unlockId];
        if (!unlockDef) return false;
        return coreResourceManager.canAfford(unlockDef.costResource, decimalUtility.new(unlockDef.costAmount));
    },

    isUnlockPurchased(unlockId) { 
        const { coreGameStateManager } = coreSystemsRef;
        const unlockDef = staticModuleData.featureUnlocks[unlockId];
        if (!unlockDef) return true;
        return coreGameStateManager.getGlobalFlag(unlockDef.flagToSet, false);
    },
    
    isUnlockVisible(unlockId) {
        const { coreGameStateManager, decimalUtility } = coreSystemsRef;
        const unlockDef = staticModuleData.featureUnlocks[unlockId];
        if (!unlockDef || unlockDef.isFuture) return false;
        if (this.isUnlockPurchased(unlockId)) return false;

        if (unlockDef.unlockCondition) {
            const { type, value } = unlockDef.unlockCondition;
            if (type === 'prestigeCount') {
                const prestigeModule = coreSystemsRef.moduleLoader.getModule('prestige');
                if (prestigeModule && prestigeModule.logic) {
                    const currentPrestigeCount = prestigeModule.logic.getTotalPrestigeCount();
                    return decimalUtility.gte(currentPrestigeCount, value);
                }
                return false;
            }
        }
        return true;
    },

    isItemVisible(itemId) {
        const { decimalUtility } = coreSystemsRef;
        const itemDef = _getScalableItemDef(itemId);
        if (!itemDef) return false;

        if (itemDef.unlockCondition) {
            const { type, id, value } = itemDef.unlockCondition;
            if (type === 'purchaseCount') {
                const purchaseCount = decimalUtility.new(moduleState.purchaseCounts[id] || "0");
                return decimalUtility.gte(purchaseCount, value);
            }
        }
        return true;
    },

    purchaseUnlock(unlockId) { 
        const { coreResourceManager, decimalUtility, coreGameStateManager, coreUIManager } = coreSystemsRef;
        const unlockDef = staticModuleData.featureUnlocks[unlockId];
        if (!unlockDef || this.isUnlockPurchased(unlockId)) return false;
        
        if (this.canAffordUnlock(unlockId)) { 
            coreResourceManager.spendAmount(unlockDef.costResource, decimalUtility.new(unlockDef.costAmount));
            coreGameStateManager.setGlobalFlag(unlockDef.flagToSet, true);
            coreUIManager.showNotification(`${unlockDef.name.replace('Unlock ','').replace(' Menu','')} Unlocked!`, 'success', 3000);
            coreUIManager.renderMenu();
            return true;
        }
        return false;
    },

    isMarketTabUnlocked() {
        if (!coreSystemsRef) return true; 
        const { coreGameStateManager, coreUIManager, loggingSystem } = coreSystemsRef;
        if (coreGameStateManager.getGlobalFlag('marketTabPermanentlyUnlocked', false)) return true; 
        const conditionMet = coreGameStateManager.getGlobalFlag('marketUnlocked', false); 
        if (conditionMet) {
            coreGameStateManager.setGlobalFlag('marketTabPermanentlyUnlocked', true);
            if(coreUIManager) coreUIManager.renderMenu(); 
            loggingSystem.info("MarketLogic", "Market tab permanently unlocked.");
            return true;
        }
        return false;
    },

    onGameLoad() {
        const { coreGameStateManager, coreResourceManager, decimalUtility } = coreSystemsRef;
        let loadedState = coreGameStateManager.getModuleState('market');
        const initialState = getInitialState();

        moduleState.purchaseCounts = { ...initialState.purchaseCounts, ...(loadedState?.purchaseCounts || {}) };
        
        Object.keys(moduleState.purchaseCounts).forEach(key => {
            moduleState.purchaseCounts[key] = decimalUtility.new(moduleState.purchaseCounts[key] || "0").toString();
        });

        this.isMarketTabUnlocked(); 
    },

    onResetState() {
        const { coreGameStateManager, coreResourceManager, decimalUtility } = coreSystemsRef;
        const initialState = getInitialState();
        Object.assign(moduleState, initialState); 
        coreGameStateManager.setModuleState('market', { ...moduleState }); 
        
        coreGameStateManager.setGlobalFlag('marketTabPermanentlyUnlocked', false);
        Object.values(staticModuleData.featureUnlocks).forEach(unlock => {
            coreGameStateManager.setGlobalFlag(unlock.flagToSet, false);
        });
        
        const imagesDef = staticModuleData.resources.images;
        if (imagesDef) {
            coreResourceManager.defineResource(imagesDef.id, imagesDef.name, decimalUtility.new(imagesDef.initialAmount), false, false, imagesDef.hasProductionRate);
        }
    }
};
