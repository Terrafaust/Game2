// modules/market_module/market_logic.js (v1.9.1 - Critical Bug Fix)

/**
 * @file market_logic.js
 * @description Business logic for the Market module.
 * v1.9.1: Fixes a crash in purchaseScalableItem caused by incorrect .toNumber() call.
 * v1.9: Implements 'Buy Max' functionality for scalable items.
 */

import { staticModuleData } from './market_data.js';
import { moduleState, getInitialState } from './market_state.js';

let coreSystemsRef = null;

export const moduleLogic = {
    initialize(coreSystems) {
        coreSystemsRef = coreSystems;
        coreSystemsRef.loggingSystem.info("MarketLogic", "Logic initialized (v1.9.1).");
    },
    
    calculateMaxBuyable(itemId) {
        const { coreResourceManager, decimalUtility } = coreSystemsRef;
        const itemDef = staticModuleData.marketItems[itemId];
        if (!itemDef) return decimalUtility.ZERO;

        const purchaseCountKey = itemDef.benefitResource;
        const ownedCount = decimalUtility.new(moduleState.purchaseCounts[purchaseCountKey] || "0");
        const costResource = itemDef.costResource;
        const currentResources = coreResourceManager.getAmount(costResource);

        const baseCost = decimalUtility.new(itemDef.baseCost);
        const costGrowthFactor = decimalUtility.new(itemDef.costGrowthFactor);

        if (decimalUtility.lt(currentResources, baseCost)) {
            return decimalUtility.ZERO;
        }
        
        const R = costGrowthFactor;
        const R_minus_1 = decimalUtility.subtract(R, 1);
        const C_base_pow_owned = decimalUtility.multiply(baseCost, decimalUtility.power(R, ownedCount));
        
        if (decimalUtility.lte(C_base_pow_owned, 0)) return decimalUtility.new(Infinity);

        const term = decimalUtility.divide(decimalUtility.multiply(currentResources, R_minus_1), C_base_pow_owned);
        const LHS = decimalUtility.add(term, 1);
        
        if (decimalUtility.lte(LHS, 1)) return decimalUtility.ZERO;

        const log_LHS = decimalUtility.ln(LHS);
        const log_R = decimalUtility.ln(R);

        if (decimalUtility.lte(log_R, 0)) return decimalUtility.ZERO;

        const max_n = decimalUtility.floor(decimalUtility.divide(log_LHS, log_R));
        
        return decimalUtility.max(max_n, 0);
    },

    calculateScalableItemCost(itemId, quantity = 1) {
        const { decimalUtility, loggingSystem } = coreSystemsRef;
        const itemDef = staticModuleData.marketItems[itemId];
        if (!itemDef) return decimalUtility.new(Infinity);

        let n = decimalUtility.new(quantity);
        if (quantity === -1) {
            n = this.calculateMaxBuyable(itemId);
            if (decimalUtility.eq(n, 0)) return decimalUtility.new(Infinity);
        }

        const baseCost = decimalUtility.new(itemDef.baseCost);
        const costGrowthFactor = decimalUtility.new(itemDef.costGrowthFactor);
        const purchaseCountKey = itemDef.benefitResource;
        const ownedCount = decimalUtility.new(moduleState.purchaseCounts[purchaseCountKey] || "0");
        
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

        return totalCost;
    },

    purchaseScalableItem(itemId) {
        const { coreResourceManager, decimalUtility, loggingSystem, coreGameStateManager, coreUIManager, buyMultiplierManager, moduleLoader } = coreSystemsRef;
        const itemDef = staticModuleData.marketItems[itemId];
        if (!itemDef) return false;

        let quantity = buyMultiplierManager.getMultiplier();
        if (quantity === -1) {
            quantity = this.calculateMaxBuyable(itemId);
            if (decimalUtility.lte(quantity, 0)) {
                loggingSystem.debug("MarketLogic", `Buy Max for ${itemDef.name} calculated 0, purchase aborted.`);
                return false;
            }
        }

        // *** THIS IS THE FIX: Removed .toNumber() from quantity ***
        const cost = this.calculateScalableItemCost(itemId, quantity);
        const costResource = itemDef.costResource;

        if (coreResourceManager.canAfford(costResource, cost)) {
            coreResourceManager.spendAmount(costResource, cost);
            
            if (itemDef.benefitResource === 'images') {
                const imagesRes = coreResourceManager.getResource('images');
                if (imagesRes && !imagesRes.isUnlocked) coreResourceManager.unlockResource('images', true);
                if (imagesRes && !imagesRes.showInUI) coreResourceManager.setResourceVisibility('images', true);
            }
            
            const benefitAmount = decimalUtility.multiply(itemDef.benefitAmountPerPurchase, quantity);
            coreResourceManager.addAmount(itemDef.benefitResource, benefitAmount);

            const purchaseCountKey = itemDef.benefitResource;
            let currentPurchaseCount = decimalUtility.new(moduleState.purchaseCounts[purchaseCountKey] || "0");
            moduleState.purchaseCounts[purchaseCountKey] = decimalUtility.add(currentPurchaseCount, quantity).toString();

            coreGameStateManager.setModuleState('market', { ...moduleState });

            loggingSystem.info("MarketLogic", `Purchased ${decimalUtility.format(quantity,0)} of ${itemDef.name}.`);
            coreUIManager.showNotification(`Acquired ${decimalUtility.format(benefitAmount,0)} ${itemDef.name.replace('Acquire ', '')}${decimalUtility.gt(quantity,1) ? 's' : ''}!`, 'success', 2000);
            
            if (itemDef.benefitResource === 'images') coreUIManager.updateResourceDisplay();
            if (itemDef.benefitResource === 'studySkillPoints') {
                const skillsModule = moduleLoader.getModule('skills');
                if (skillsModule?.logic?.isSkillsTabUnlocked) skillsModule.logic.isSkillsTabUnlocked(); 
                else coreUIManager.renderMenu();
            }
            return true;
        } else {
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
        return coreGameStateManager.getGlobalFlag(`marketUnlock_${unlockDef.flagToSet}_purchased`, false);
    },

    purchaseUnlock(unlockId) { 
        const { coreResourceManager, decimalUtility, coreGameStateManager, coreUIManager, moduleLoader } = coreSystemsRef;
        const unlockDef = staticModuleData.marketUnlocks[unlockId];
        if (!unlockDef) return false;
        if (this.isUnlockPurchased(unlockId)) return false;
        if (this.canAffordUnlock(unlockId)) { 
            coreResourceManager.spendAmount(unlockDef.costResource, decimalUtility.new(unlockDef.costAmount));
            coreGameStateManager.setGlobalFlag(unlockDef.flagToSet, true);
            coreGameStateManager.setGlobalFlag(`marketUnlock_${unlockDef.flagToSet}_purchased`, true); 
            coreUIManager.showNotification(`${unlockDef.name.replace('Unlock ','').replace(' Menu','')} Unlocked!`, 'success', 3000);
            if (unlockId === 'settingsTab') {
                const settingsModule = moduleLoader.getModule('settings_ui');
                if (settingsModule?.logic?.isSettingsTabUnlocked) settingsModule.logic.isSettingsTabUnlocked(); 
                else coreUIManager.renderMenu();
            } else if (unlockId === 'achievementsTab') {
                 const achievementsModule = moduleLoader.getModule('achievements');
                if (achievementsModule?.logic?.isAchievementsTabUnlocked) achievementsModule.logic.isAchievementsTabUnlocked(); 
                else coreUIManager.renderMenu();
            } else {
                 coreUIManager.renderMenu(); 
            }
            return true;
        } else {
            return false;
        }
    },

    isMarketTabUnlocked() {
        if (!coreSystemsRef) { return true; }
        const { coreGameStateManager, coreUIManager } = coreSystemsRef;
        if (coreGameStateManager.getGlobalFlag('marketTabPermanentlyUnlocked', false)) { return true; }
        const conditionMet = coreGameStateManager.getGlobalFlag('marketUnlocked', false); 
        if (conditionMet) {
            coreGameStateManager.setGlobalFlag('marketTabPermanentlyUnlocked', true);
            if(coreUIManager) coreUIManager.renderMenu();
            return true;
        }
        return false;
    },

    onGameLoad() {
        const { coreGameStateManager, coreResourceManager, decimalUtility } = coreSystemsRef;
        let loadedState = coreGameStateManager.getModuleState('market');
        const initialCounts = getInitialState().purchaseCounts;
        moduleState.purchaseCounts = { ...initialCounts }; 
        if (loadedState?.purchaseCounts) {
             for (const key in loadedState.purchaseCounts) {
                if (moduleState.purchaseCounts.hasOwnProperty(key)) { 
                    moduleState.purchaseCounts[key] = decimalUtility.new(loadedState.purchaseCounts[key] || "0").toString();
                }
            }
        }
        this.isMarketTabUnlocked(); 
        const imagesRes = coreResourceManager.getResource('images');
        if (imagesRes && imagesRes.isUnlocked && decimalUtility.gt(imagesRes.amount, 0) && !imagesRes.showInUI) {
            coreResourceManager.setResourceVisibility('images', true);
        }
    },

    onResetState() {
        const { coreGameStateManager, coreResourceManager, decimalUtility } = coreSystemsRef;
        const initialState = getInitialState();
        Object.assign(moduleState, initialState); 
        coreGameStateManager.setModuleState('market', { ...moduleState }); 
        coreGameStateManager.setGlobalFlag('marketTabPermanentlyUnlocked', false);
        coreGameStateManager.setGlobalFlag(`marketUnlock_settingsTabUnlocked_purchased`, false);
        coreGameStateManager.setGlobalFlag(`marketUnlock_achievementsTabUnlocked_purchased`, false);
        const imagesDef = staticModuleData.resources.images;
        if (imagesDef) {
            coreResourceManager.defineResource(
                imagesDef.id, imagesDef.name, decimalUtility.new(imagesDef.initialAmount),
                false, false, imagesDef.hasProductionRate
            );
        }
    }
};
