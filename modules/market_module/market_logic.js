// modules/market_module/market_logic.js (v7.0 - Complete & Refactored)
// Uses decimalUtility, constants, and has all functions fully implemented.

import { staticModuleData } from './market_data.js';
import { moduleState, getInitialState } from './market_state.js';
import { RESOURCES, GLOBAL_FLAGS, UPGRADE_TARGETS, MODULES } from '../../core/constants.js';

let coreSystemsRef = null;

function _getScalableItemDef(itemId) {
    if (staticModuleData.consumables?.[itemId]) return staticModuleData.consumables[itemId];
    if (staticModuleData.skillPoints?.[itemId]) return staticModuleData.skillPoints[itemId];
    return null;
}

export const moduleLogic = {
    initialize(coreSystems) {
        coreSystemsRef = coreSystems;
        coreSystemsRef.loggingSystem.info("MarketLogic", "Logic initialized (v7.0).");
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
        let growthFactor = decimalUtility.new(itemDef.costGrowthFactor);
        const purchaseCountKey = itemDef.benefitResource;
        const ownedCount = decimalUtility.new(moduleState.purchaseCounts[purchaseCountKey] || "0");

        const costReductionMultiplier = coreUpgradeManager.getCostReductionMultiplier(UPGRADE_TARGETS.MARKET_ITEMS, itemId);
        const effectiveBaseCost = decimalUtility.multiply(baseCost, costReductionMultiplier);
        
        const growthReduction = coreUpgradeManager.getAggregatedModifiers(UPGRADE_TARGETS.MARKET_ITEMS, itemId, 'COST_GROWTH_REDUCTION');
        if (decimalUtility.gt(growthReduction, 0) && decimalUtility.lt(growthReduction, 1)) {
            const growthPart = decimalUtility.subtract(growthFactor, 1);
            const reducedGrowthPart = decimalUtility.multiply(growthPart, decimalUtility.subtract(1, growthReduction));
            growthFactor = decimalUtility.add(1, reducedGrowthPart);
        }

        return decimalUtility.getGeometricSeriesCost(effectiveBaseCost, growthFactor, ownedCount, n);
    },

    calculateMaxBuyable(itemId) {
        const { coreResourceManager, decimalUtility, coreUpgradeManager } = coreSystemsRef;
        const itemDef = _getScalableItemDef(itemId);
        if (!itemDef) return decimalUtility.ZERO;

        const purchaseCountKey = itemDef.benefitResource;
        const ownedCount = decimalUtility.new(moduleState.purchaseCounts[purchaseCountKey] || "0");
        const availableCurrency = coreResourceManager.getAmount(itemDef.costResource);
        const baseCost = decimalUtility.new(itemDef.baseCost);
        let growthFactor = decimalUtility.new(itemDef.costGrowthFactor);

        const costReductionMultiplier = coreUpgradeManager.getCostReductionMultiplier(UPGRADE_TARGETS.MARKET_ITEMS, itemId);
        const effectiveBaseCost = decimalUtility.multiply(baseCost, costReductionMultiplier);

        const growthReduction = coreUpgradeManager.getAggregatedModifiers(UPGRADE_TARGETS.MARKET_ITEMS, itemId, 'COST_GROWTH_REDUCTION');
        if (decimalUtility.gt(growthReduction, 0) && decimalUtility.lt(growthReduction, 1)) {
            const growthPart = decimalUtility.subtract(growthFactor, 1);
            const reducedGrowthPart = decimalUtility.multiply(growthPart, decimalUtility.subtract(1, growthReduction));
            growthFactor = decimalUtility.add(1, reducedGrowthPart);
        }

        return decimalUtility.getMaxBuyableGeometric(availableCurrency, effectiveBaseCost, growthFactor, ownedCount);
    },

    purchaseScalableItem(itemId) {
        const { coreResourceManager, decimalUtility, coreGameStateManager, coreUIManager, buyMultiplierManager, moduleLoader } = coreSystemsRef;
        const itemDef = _getScalableItemDef(itemId);
        if (!itemDef) return false;
        
        let quantity = buyMultiplierManager.getMultiplier();
        if (quantity === -1) {
            quantity = this.calculateMaxBuyable(itemId);
            if (decimalUtility.lte(quantity, 0)) {
                 coreUIManager.showNotification('ui.notifications.cannot_afford', 'warning', 3000, { replacements: { itemName: itemDef.name.replace('Acquire ', '') } });
                return false;
            }
        } else {
            quantity = decimalUtility.new(quantity);
        }

        const cost = this.calculateScalableItemCost(itemId, quantity);
        if (coreResourceManager.canAfford(itemDef.costResource, cost)) {
            coreResourceManager.spendAmount(itemDef.costResource, cost);
            
            const benefitAmount = decimalUtility.multiply(itemDef.benefitAmountPerPurchase, quantity);
            coreResourceManager.addAmount(itemDef.benefitResource, benefitAmount);
            
            const purchaseCountKey = itemDef.benefitResource;
            moduleState.purchaseCounts[purchaseCountKey] = decimalUtility.add(moduleState.purchaseCounts[purchaseCountKey] || "0", quantity).toString();
            coreGameStateManager.setModuleState(MODULES.MARKET, { ...moduleState });
            
            coreUIManager.showNotification('ui.notifications.item_acquired', 'success', 2000, { replacements: { quantity: decimalUtility.format(benefitAmount,0), itemName: itemDef.name.replace('Acquire ', '') }});
            
            if (itemDef.benefitResource === RESOURCES.STUDY_SKILL_POINTS || itemDef.benefitResource === RESOURCES.PRESTIGE_SKILL_POINTS) {
                moduleLoader.getModule(MODULES.SKILLS)?.logic.isSkillsTabUnlocked();
            }
            return true;
        } else {
             coreUIManager.showNotification('ui.notifications.not_enough_resources', 'error');
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
        return unlockDef ? coreGameStateManager.getGlobalFlag(unlockDef.flagToSet, false) : true;
    },
    
    isUnlockVisible(unlockId) {
        const { coreGameStateManager, decimalUtility, moduleLoader } = coreSystemsRef;
        const unlockDef = staticModuleData.featureUnlocks[unlockId];
        if (!unlockDef || unlockDef.isFuture || this.isUnlockPurchased(unlockId)) return false;

        if (unlockDef.unlockCondition?.type === 'prestigeCount') {
            const prestigeLogic = moduleLoader.getModule(MODULES.PRESTIGE)?.logic;
            return prestigeLogic ? decimalUtility.gte(prestigeLogic.getTotalPrestigeCount(), unlockDef.unlockCondition.value) : false;
        }
        return true;
    },

    isItemVisible(itemId) {
        const { decimalUtility } = coreSystemsRef;
        const itemDef = _getScalableItemDef(itemId);
        if (!itemDef) return false;

        if (itemDef.unlockCondition?.type === 'purchaseCount') {
            const purchaseCount = decimalUtility.new(moduleState.purchaseCounts[itemDef.unlockCondition.id] || "0");
            return decimalUtility.gte(purchaseCount, itemDef.unlockCondition.value);
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
            coreUIManager.showNotification(`${unlockDef.name.replace('Unlock ','')} Unlocked!`, 'success', 3000);
            coreUIManager.renderMenu();
            return true;
        }
        return false;
    },

    isMarketTabUnlocked() {
        if (!coreSystemsRef) return true; 
        const { coreGameStateManager, coreUIManager } = coreSystemsRef;
        if (coreGameStateManager.getGlobalFlag(GLOBAL_FLAGS.MARKET_TAB_UNLOCKED, false)) return true; 
        
        if (coreGameStateManager.getGlobalFlag(GLOBAL_FLAGS.MARKET_UNLOCKED, false)) {
            coreGameStateManager.setGlobalFlag(GLOBAL_FLAGS.MARKET_TAB_UNLOCKED, true);
            if(coreUIManager) coreUIManager.renderMenu(); 
            return true;
        }
        return false;
    },

    onGameLoad() {
        const { coreGameStateManager, decimalUtility } = coreSystemsRef;
        let loadedState = coreGameStateManager.getModuleState(MODULES.MARKET);
        const initialState = getInitialState();
        moduleState.purchaseCounts = { ...initialState.purchaseCounts, ...(loadedState?.purchaseCounts || {}) };
        Object.keys(moduleState.purchaseCounts).forEach(key => {
            moduleState.purchaseCounts[key] = decimalUtility.new(moduleState.purchaseCounts[key] || "0").toString();
        });
        this.isMarketTabUnlocked(); 
    },

    onResetState() {
        const { coreGameStateManager } = coreSystemsRef;
        Object.assign(moduleState, getInitialState()); 
        coreGameStateManager.setModuleState(MODULES.MARKET, { ...moduleState }); 
        coreGameStateManager.setGlobalFlag(GLOBAL_FLAGS.MARKET_TAB_UNLOCKED, false);
        Object.values(staticModuleData.featureUnlocks).forEach(unlock => {
            coreGameStateManager.setGlobalFlag(unlock.flagToSet, false);
        });
    },

    onPrestigeReset() {
        const { coreGameStateManager } = coreSystemsRef;
        Object.assign(moduleState, getInitialState());
        coreGameStateManager.setModuleState(MODULES.MARKET, { ...moduleState });
    }
};
