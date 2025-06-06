// modules/market_module/market_logic.js (v1.8 - Buy Multiplier)

/**
 * @file market_logic.js
 * @description Business logic for the Market module.
 * v1.8: Implements buy multiplier for purchasing scalable items.
 * v1.7: Explicitly unlock and show 'images' resource on first purchase.
 */

import { staticModuleData } from './market_data.js';
import { moduleState, getInitialState } from './market_state.js';

let coreSystemsRef = null;

export const moduleLogic = {
    initialize(coreSystems) {
        coreSystemsRef = coreSystems;
        coreSystemsRef.loggingSystem.info("MarketLogic", "Logic initialized (v1.8).");
    },

    isMarketTabUnlocked() {
        if (!coreSystemsRef || !coreSystemsRef.coreGameStateManager) {
            console.error("MarketLogic_isMarketTabUnlocked_CRITICAL: coreGameStateManager missing!");
            return true; 
        }
        const { coreGameStateManager, coreUIManager, loggingSystem } = coreSystemsRef;

        if (coreGameStateManager.getGlobalFlag('marketTabPermanentlyUnlocked', false)) {
            return true;
        }
        const conditionMet = coreGameStateManager.getGlobalFlag('marketUnlocked', false); 
        if (conditionMet) {
            coreGameStateManager.setGlobalFlag('marketTabPermanentlyUnlocked', true);
            if(coreUIManager) coreUIManager.renderMenu();
            loggingSystem.info("MarketLogic", "Market tab permanently unlocked.");
            return true;
        }
        return false;
    },

    calculateScalableItemCost(itemId, quantity = 1) {
        const { decimalUtility, loggingSystem } = coreSystemsRef;
        const itemDef = staticModuleData.marketItems[itemId];

        if (!itemDef) {
            loggingSystem.error("MarketLogic_CalcCost", `Scalable item definition not found for ID: ${itemId}`);
            return decimalUtility.new(Infinity);
        }

        const baseCost = decimalUtility.new(itemDef.baseCost);
        const costGrowthFactor = decimalUtility.new(itemDef.costGrowthFactor);
        const purchaseCountKey = itemDef.benefitResource; 
        const ownedCount = decimalUtility.new(moduleState.purchaseCounts[purchaseCountKey] || "0");
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

        return totalCost;
    },

    purchaseScalableItem(itemId) {
        const { coreResourceManager, decimalUtility, loggingSystem, coreGameStateManager, coreUIManager, buyMultiplierManager, moduleLoader } = coreSystemsRef;
        const itemDef = staticModuleData.marketItems[itemId];

        if (!itemDef) return false;
        
        const quantity = buyMultiplierManager.getMultiplier();
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

            loggingSystem.info("MarketLogic_PurchaseScalable", `Purchased ${quantity} of ${itemDef.name}.`);
            coreUIManager.showNotification(`Acquired ${decimalUtility.format(benefitAmount,0)} ${itemDef.name.replace('Acquire ', '')}${quantity > 1 ? 's' : ''}!`, 'success', 2000);
            
            if (itemDef.benefitResource === 'images') {
                coreUIManager.updateResourceDisplay(); 
            }

            if (itemDef.benefitResource === 'studySkillPoints') {
                const skillsModule = moduleLoader.getModule('skills');
                if (skillsModule && skillsModule.logic && typeof skillsModule.logic.isSkillsTabUnlocked === 'function') {
                    skillsModule.logic.isSkillsTabUnlocked(); 
                } else {
                    coreUIManager.renderMenu(); 
                }
            }
            return true;
        } else {
            coreUIManager.showNotification(`Not enough ${costResource} to purchase.`, 'error', 2000);
            return false;
        }
    },
    
    // ... all other functions from your original file remain untouched ...

    canAffordUnlock(unlockId) { 
        const { coreResourceManager, decimalUtility, loggingSystem } = coreSystemsRef;
        const unlockDef = staticModuleData.marketUnlocks[unlockId];
        if (!unlockDef) {
            loggingSystem.warn("MarketLogic_CanAffordUnlock", `Unlock definition for ${unlockId} not found.`);
            return false;
        }
        const cost = decimalUtility.new(unlockDef.costAmount);
        const currentAmount = coreResourceManager.getAmount(unlockDef.costResource);
        const canAfford = coreResourceManager.canAfford(unlockDef.costResource, cost);
        loggingSystem.debug("MarketLogic_CanAffordUnlock", `Checking affordability for ${unlockId} ('${unlockDef.name}'). Needs ${cost.toString()} ${unlockDef.costResource}. Have: ${currentAmount.toString()}. Can afford: ${canAfford}`);
        return canAfford;
    },

    isUnlockPurchased(unlockId) { 
        const { coreGameStateManager, loggingSystem } = coreSystemsRef;
        const unlockDef = staticModuleData.marketUnlocks[unlockId];
        if (!unlockDef) {
            loggingSystem.warn("MarketLogic_IsUnlockPurchased", `Unlock definition for ${unlockId} not found, assuming not purchasable/already handled.`);
            return true; 
        }
        
        const marketPurchaseFlag = `marketUnlock_${unlockDef.flagToSet}_purchased`;
        const isPurchased = coreGameStateManager.getGlobalFlag(marketPurchaseFlag, false);
        loggingSystem.debug("MarketLogic_IsUnlockPurchased", `Checking if market unlock '${unlockId}' (${unlockDef.name}) is purchased. Flag '${marketPurchaseFlag}': ${isPurchased}`);
        return isPurchased;
    },

    purchaseUnlock(unlockId) { 
        const { coreResourceManager, decimalUtility, loggingSystem, coreGameStateManager, coreUIManager, moduleLoader } = coreSystemsRef;
        const unlockDef = staticModuleData.marketUnlocks[unlockId];

        if (!unlockDef) {
            loggingSystem.error("MarketLogic_PurchaseUnlock", `Attempted to purchase unknown unlock: ${unlockId}`);
            return false;
        }
        loggingSystem.debug("MarketLogic_PurchaseUnlock", `Attempting to purchase unlock: ${unlockId} ('${unlockDef.name}')`);

        const marketPurchaseFlag = `marketUnlock_${unlockDef.flagToSet}_purchased`;
        if(coreGameStateManager.getGlobalFlag(marketPurchaseFlag, false)){
            loggingSystem.info("MarketLogic_PurchaseUnlock", `${unlockDef.name} market purchase already completed.`);
            coreUIManager.showNotification(`${unlockDef.name.replace('Unlock ','').replace(' Menu','')} already unlocked.`, 'info');
            return false; 
        }

        const costAmount = decimalUtility.new(unlockDef.costAmount);
        if (this.canAffordUnlock(unlockId)) { 
            coreResourceManager.spendAmount(unlockDef.costResource, costAmount);
            
            coreGameStateManager.setGlobalFlag(unlockDef.flagToSet, true);
            coreGameStateManager.setGlobalFlag(marketPurchaseFlag, true); 

            loggingSystem.info("MarketLogic_PurchaseUnlock", `Purchased unlock for ${unlockDef.name}.`);
            coreUIManager.showNotification(`${unlockDef.name.replace('Unlock ','').replace(' Menu','')} Unlocked!`, 'success', 3000);
            
            if (unlockId === 'settingsTab') {
                const settingsModule = moduleLoader.getModule('settings_ui');
                if (settingsModule && settingsModule.logic && settingsModule.logic.isSettingsTabUnlocked) {
                    settingsModule.logic.isSettingsTabUnlocked(); 
                } else { coreUIManager.renderMenu(); }
            } else if (unlockId === 'achievementsTab') {
                 const achievementsModule = moduleLoader.getModule('achievements');
                if (achievementsModule && achievementsModule.logic && achievementsModule.logic.isAchievementsTabUnlocked) {
                    achievementsModule.logic.isAchievementsTabUnlocked(); 
                } else { coreUIManager.renderMenu(); }
            } else {
                 coreUIManager.renderMenu(); 
            }
            return true;
        } else {
            loggingSystem.warn("MarketLogic_PurchaseUnlock", `Cannot afford ${unlockDef.name}.`);
            coreUIManager.showNotification(`Not enough ${unlockDef.costResource} to unlock ${unlockDef.name.replace('Unlock ','').replace(' Menu','')}.`, 'error', 2000);
            return false;
        }
    },

    onGameLoad() {
        const { coreGameStateManager, loggingSystem } = coreSystemsRef;
        loggingSystem.info("MarketLogic", "onGameLoad triggered for Market module (v1.7).");
        let loadedState = coreGameStateManager.getModuleState('market');
        
        const initialCounts = getInitialState().purchaseCounts;
        moduleState.purchaseCounts = { ...initialCounts }; 

        if (loadedState && loadedState.purchaseCounts) {
             for (const key in loadedState.purchaseCounts) {
                if (moduleState.purchaseCounts.hasOwnProperty(key)) { 
                    moduleState.purchaseCounts[key] = coreSystemsRef.decimalUtility.new(loadedState.purchaseCounts[key] || "0").toString();
                }
            }
        }
        this.isMarketTabUnlocked(); 
        const imagesRes = coreSystemsRef.coreResourceManager.getResource('images');
        if (imagesRes && imagesRes.isUnlocked && coreSystemsRef.decimalUtility.gt(imagesRes.amount, 0) && !imagesRes.showInUI) {
            coreSystemsRef.coreResourceManager.setResourceVisibility('images', true);
            loggingSystem.info("MarketLogic_onGameLoad", "'images' visibility set to true based on loaded amount.");
        }
    },

    onResetState() {
        const { loggingSystem, coreGameStateManager, coreResourceManager, decimalUtility } = coreSystemsRef;
        loggingSystem.info("MarketLogic", "onResetState triggered for Market module (v1.7).");
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
             loggingSystem.info("MarketLogic_onResetState", "'images' resource properties reset to initial (hidden, locked).");
        }
        loggingSystem.info("MarketLogic", "'marketTabPermanentlyUnlocked' and related market purchase flags cleared.");
    }
};
