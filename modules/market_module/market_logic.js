// modules/market_module/market_logic.js (v1.1 - Fix)

/**
 * @file market_logic.js
 * @description Business logic for the Market module.
 * v1.1: Triggers menu re-render after buying Study Skill Points.
 */

import { staticModuleData } from './market_data.js';
import { moduleState } from './market_state.js'; 

let coreSystemsRef = null;

export const moduleLogic = {
    initialize(coreSystems) {
        coreSystemsRef = coreSystems;
        coreSystemsRef.loggingSystem.info("MarketLogic", "Logic initialized (v1.1).");
    },

    isMarketTabUnlocked() {
        if (!coreSystemsRef) return false;
        return coreSystemsRef.coreGameStateManager.getGlobalFlag('marketUnlocked', false);
    },

    calculateScalableItemCost(itemId) {
        const { decimalUtility, loggingSystem } = coreSystemsRef;
        const itemDef = staticModuleData.marketItems[itemId];

        if (!itemDef) {
            loggingSystem.error("MarketLogic", `Scalable item definition not found for ID: ${itemId}`);
            return decimalUtility.new(Infinity);
        }

        const baseCost = decimalUtility.new(itemDef.baseCost);
        const costGrowthFactor = decimalUtility.new(itemDef.costGrowthFactor);
        const purchaseCountKey = itemDef.benefitResource; 
        const ownedCount = decimalUtility.new(moduleState.purchaseCounts[purchaseCountKey] || "0");

        return decimalUtility.multiply(baseCost, decimalUtility.power(costGrowthFactor, ownedCount));
    },

    purchaseScalableItem(itemId) {
        const { coreResourceManager, decimalUtility, loggingSystem, coreGameStateManager, coreUIManager } = coreSystemsRef;
        const itemDef = staticModuleData.marketItems[itemId];

        if (!itemDef) {
            loggingSystem.error("MarketLogic", `Attempted to purchase unknown scalable item: ${itemId}`);
            return false;
        }

        const cost = this.calculateScalableItemCost(itemId);
        const costResource = itemDef.costResource;

        if (coreResourceManager.canAfford(costResource, cost)) {
            coreResourceManager.spendAmount(costResource, cost);
            coreResourceManager.addAmount(itemDef.benefitResource, decimalUtility.new(itemDef.benefitAmountPerPurchase));

            const purchaseCountKey = itemDef.benefitResource;
            let currentPurchaseCount = decimalUtility.new(moduleState.purchaseCounts[purchaseCountKey] || "0");
            moduleState.purchaseCounts[purchaseCountKey] = decimalUtility.add(currentPurchaseCount, 1).toString();

            coreGameStateManager.setModuleState('market', { ...moduleState });

            loggingSystem.info("MarketLogic", `Purchased ${itemDef.name}. Cost: ${decimalUtility.format(cost)} ${costResource}. New total ${itemDef.benefitResource}: ${coreResourceManager.getAmount(itemDef.benefitResource).toString()}`);
            coreUIManager.showNotification(`Acquired 1 ${itemDef.benefitResource === 'images' ? 'Image' : 'Study Skill Point'}!`, 'success', 2000);

            // --- Fix Added: Re-render menu if Study Skill Points were bought ---
            if (itemDef.benefitResource === 'studySkillPoints') {
                coreUIManager.renderMenu(); // Update menu to show/hide Skills tab
            }
            // --- End Fix ---
            return true;
        } else {
            loggingSystem.debug("MarketLogic", `Cannot afford ${itemDef.name}. Need ${decimalUtility.format(cost)} ${costResource}.`);
            coreUIManager.showNotification(`Not enough ${costResource} for ${itemDef.name}.`, 'error', 2000);
            return false;
        }
    },

    canAffordUnlock(unlockId) {
        const { coreResourceManager, decimalUtility } = coreSystemsRef;
        const unlockDef = staticModuleData.marketUnlocks[unlockId];
        if (!unlockDef) return false;
        return coreResourceManager.canAfford(unlockDef.costResource, decimalUtility.new(unlockDef.costAmount));
    },

    isUnlockPurchased(unlockId) {
        const { coreGameStateManager } = coreSystemsRef;
        const unlockDef = staticModuleData.marketUnlocks[unlockId];
        if (!unlockDef) return true; 
        return coreGameStateManager.getGlobalFlag(unlockDef.flagToSet, false);
    },

    purchaseUnlock(unlockId) {
        const { coreResourceManager, decimalUtility, loggingSystem, coreGameStateManager, coreUIManager } = coreSystemsRef;
        const unlockDef = staticModuleData.marketUnlocks[unlockId];

        if (!unlockDef) {
            loggingSystem.error("MarketLogic", `Attempted to purchase unknown unlock: ${unlockId}`);
            return false;
        }

        if (this.isUnlockPurchased(unlockId)) {
            loggingSystem.info("MarketLogic", `${unlockDef.name} is already unlocked.`);
            coreUIManager.showNotification(`${unlockDef.name} is already unlocked.`, 'info');
            return false; 
        }

        const costAmount = decimalUtility.new(unlockDef.costAmount);
        if (coreResourceManager.canAfford(unlockDef.costResource, costAmount)) {
            coreResourceManager.spendAmount(unlockDef.costResource, costAmount);
            coreGameStateManager.setGlobalFlag(unlockDef.flagToSet, true);

            loggingSystem.info("MarketLogic", `Purchased ${unlockDef.name}. Cost: ${decimalUtility.format(costAmount)} ${unlockDef.costResource}. Flag '${unlockDef.flagToSet}' set.`);
            coreUIManager.showNotification(`${unlockDef.name} Unlocked!`, 'success', 3000);
            coreUIManager.renderMenu(); 
            return true;
        } else {
            loggingSystem.debug("MarketLogic", `Cannot afford ${unlockDef.name}. Need ${decimalUtility.format(costAmount)} ${unlockDef.costResource}.`);
            coreUIManager.showNotification(`Not enough ${unlockDef.costResource} to unlock ${unlockDef.name}.`, 'error', 2000);
            return false;
        }
    },

    onGameLoad() {
        const { coreGameStateManager, loggingSystem } = coreSystemsRef;
        loggingSystem.info("MarketLogic", "onGameLoad triggered for Market module.");
        let loadedState = coreGameStateManager.getModuleState('market');
        if (loadedState && loadedState.purchaseCounts) {
             for (const key in loadedState.purchaseCounts) {
                moduleState.purchaseCounts[key] = coreSystemsRef.decimalUtility.new(loadedState.purchaseCounts[key] || "0").toString();
            }
        } else {
            const initialState = getInitialState();
            Object.assign(moduleState.purchaseCounts, initialState.purchaseCounts);
        }
    },

    onResetState() {
        const { loggingSystem, coreGameStateManager } = coreSystemsRef;
        loggingSystem.info("MarketLogic", "onResetState triggered for Market module.");
        const initialState = getInitialState();
        Object.assign(moduleState, initialState); 
        coreGameStateManager.setModuleState('market', { ...moduleState }); 
    }
};
