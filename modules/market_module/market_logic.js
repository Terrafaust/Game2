// modules/market_module/market_logic.js (v1.6 - Enhanced Logging & Skill Tab Trigger)

/**
 * @file market_logic.js
 * @description Business logic for the Market module.
 * v1.6: Added more detailed logging for unlock conditions and ensuring UI updates.
 * v1.5: Explicitly trigger UI update after image purchase and skill tab unlock check after SSP purchase.
 */

import { staticModuleData } from './market_data.js';
import { moduleState, getInitialState } from './market_state.js';

let coreSystemsRef = null;

export const moduleLogic = {
    initialize(coreSystems) {
        coreSystemsRef = coreSystems;
        coreSystemsRef.loggingSystem.info("MarketLogic", "Logic initialized (v1.6).");
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

    calculateScalableItemCost(itemId) {
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
        // loggingSystem.debug("MarketLogic_CalcCost", `Calculating cost for ${itemId}: base=${baseCost}, growth=${costGrowthFactor}, owned=${ownedCount}`);
        return decimalUtility.multiply(baseCost, decimalUtility.power(costGrowthFactor, ownedCount));
    },

    purchaseScalableItem(itemId) {
        const { coreResourceManager, decimalUtility, loggingSystem, coreGameStateManager, coreUIManager, moduleLoader } = coreSystemsRef;
        const itemDef = staticModuleData.marketItems[itemId];

        if (!itemDef) {
            loggingSystem.error("MarketLogic_PurchaseScalable", `Attempted to purchase unknown scalable item: ${itemId}`);
            return false;
        }

        const cost = this.calculateScalableItemCost(itemId);
        const costResource = itemDef.costResource;
        loggingSystem.debug("MarketLogic_PurchaseScalable", `Attempting to buy ${itemId}. Cost: ${cost.toString()} ${costResource}. Have: ${coreResourceManager.getAmount(costResource).toString()}`);

        if (coreResourceManager.canAfford(costResource, cost)) {
            coreResourceManager.spendAmount(costResource, cost);
            coreResourceManager.addAmount(itemDef.benefitResource, decimalUtility.new(itemDef.benefitAmountPerPurchase));
            loggingSystem.info("MarketLogic_PurchaseScalable", `${itemDef.benefitResource} amount after purchase: ${coreResourceManager.getAmount(itemDef.benefitResource).toString()}`);


            const purchaseCountKey = itemDef.benefitResource;
            let currentPurchaseCount = decimalUtility.new(moduleState.purchaseCounts[purchaseCountKey] || "0");
            moduleState.purchaseCounts[purchaseCountKey] = decimalUtility.add(currentPurchaseCount, 1).toString();

            coreGameStateManager.setModuleState('market', { ...moduleState });

            loggingSystem.info("MarketLogic_PurchaseScalable", `Purchased ${itemDef.name}. Cost: ${decimalUtility.format(cost)} ${costResource}.`);
            coreUIManager.showNotification(`Acquired 1 ${itemDef.name.includes('Image') ? 'Image' : 'Study Skill Point'}!`, 'success', 2000);
            
            if (itemDef.benefitResource === 'images') {
                loggingSystem.debug("MarketLogic_PurchaseScalable", "Image purchased, calling updateResourceDisplay.");
                coreUIManager.updateResourceDisplay(); // Explicitly update resource display
            }

            if (itemDef.benefitResource === 'studySkillPoints') {
                loggingSystem.debug("MarketLogic_PurchaseScalable", "SSP purchased, attempting to unlock skills tab.");
                const skillsModule = moduleLoader.getModule('skills');
                if (skillsModule && skillsModule.logic && typeof skillsModule.logic.isSkillsTabUnlocked === 'function') {
                    skillsModule.logic.isSkillsTabUnlocked(); 
                } else {
                    loggingSystem.warn("MarketLogic_PurchaseScalable", "Skills module or its unlock logic not found. Calling generic renderMenu.");
                    coreUIManager.renderMenu(); 
                }
            }
            // This will be picked up by the game loop's UI update for the market tab itself
            // if (coreUIManager.isActiveTab('market')) { ui.updateDynamicElements(); } 
            return true;
        } else {
            loggingSystem.warn("MarketLogic_PurchaseScalable", `Cannot afford ${itemDef.name}. Need ${decimalUtility.format(cost)} ${costResource}.`);
            coreUIManager.showNotification(`Not enough ${costResource} for ${itemDef.name}.`, 'error', 2000);
            return false;
        }
    },

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
        if (this.canAffordUnlock(unlockId)) { // Use the internal canAffordUnlock for consistent logging
            coreResourceManager.spendAmount(unlockDef.costResource, costAmount);
            
            coreGameStateManager.setGlobalFlag(unlockDef.flagToSet, true);
            coreGameStateManager.setGlobalFlag(marketPurchaseFlag, true); 

            loggingSystem.info("MarketLogic_PurchaseUnlock", `Purchased unlock for ${unlockDef.name}. Trigger flag '${unlockDef.flagToSet}' set. Market purchase flag '${marketPurchaseFlag}' set.`);
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
            // if (coreUIManager.isActiveTab('market')) { ui.updateDynamicElements(); } // Game loop will handle this
            return true;
        } else {
            loggingSystem.warn("MarketLogic_PurchaseUnlock", `Cannot afford ${unlockDef.name}. Need ${decimalUtility.format(costAmount)} ${unlockDef.costResource}.`);
            coreUIManager.showNotification(`Not enough ${unlockDef.costResource} to unlock ${unlockDef.name.replace('Unlock ','').replace(' Menu','')}.`, 'error', 2000);
            return false;
        }
    },

    onGameLoad() {
        const { coreGameStateManager, loggingSystem } = coreSystemsRef;
        loggingSystem.info("MarketLogic", "onGameLoad triggered for Market module (v1.6).");
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
    },

    onResetState() {
        const { loggingSystem, coreGameStateManager } = coreSystemsRef;
        loggingSystem.info("MarketLogic", "onResetState triggered for Market module (v1.6).");
        const initialState = getInitialState();
        Object.assign(moduleState, initialState); 
        coreGameStateManager.setModuleState('market', { ...moduleState }); 
        
        coreGameStateManager.setGlobalFlag('marketTabPermanentlyUnlocked', false);
        coreGameStateManager.setGlobalFlag(`marketUnlock_settingsTabUnlocked_purchased`, false);
        coreGameStateManager.setGlobalFlag(`marketUnlock_achievementsTabUnlocked_purchased`, false);

        loggingSystem.info("MarketLogic", "'marketTabPermanentlyUnlocked' and related market purchase flags cleared.");
    }
};
