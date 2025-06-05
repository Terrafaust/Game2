// modules/market_module/market_logic.js (v1.5 - UI Refresh and Skill Tab Trigger)

/**
 * @file market_logic.js
 * @description Business logic for the Market module.
 * v1.5: Explicitly trigger UI update after image purchase and skill tab unlock check after SSP purchase.
 * v1.4: Ensures 'marketTabPermanentlyUnlocked' flag is cleared on reset and checks it correctly.
 */

import { staticModuleData } from './market_data.js';
import { moduleState, getInitialState } from './market_state.js'; // Added getInitialState

let coreSystemsRef = null;

export const moduleLogic = {
    initialize(coreSystems) {
        coreSystemsRef = coreSystems;
        coreSystemsRef.loggingSystem.info("MarketLogic", "Logic initialized (v1.5).");
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
        const { coreResourceManager, decimalUtility, loggingSystem, coreGameStateManager, coreUIManager, moduleLoader } = coreSystemsRef;
        const itemDef = staticModuleData.marketItems[itemId];

        if (!itemDef) {
            loggingSystem.error("MarketLogic", `Attempted to purchase unknown scalable item: ${itemId}`);
            return false;
        }

        const cost = this.calculateScalableItemCost(itemId);
        const costResource = itemDef.costResource;

        if (coreResourceManager.canAfford(costResource, cost)) {
            coreResourceManager.spendAmount(costResource, cost);
            
            // Unlock the resource if it's the first time getting it (e.g. for 'images')
            // coreResourceManager.defineResource ensures it's known, but unlock makes it active.
            // However, 'images' is defined as unlocked from the start in market_data.
            // coreResourceManager.unlockResource(itemDef.benefitResource); // Might not be needed if defined as unlocked
            // coreResourceManager.setResourceVisibility(itemDef.benefitResource, true); // Might not be needed if defined as showInUI: true

            coreResourceManager.addAmount(itemDef.benefitResource, decimalUtility.new(itemDef.benefitAmountPerPurchase));

            const purchaseCountKey = itemDef.benefitResource;
            let currentPurchaseCount = decimalUtility.new(moduleState.purchaseCounts[purchaseCountKey] || "0");
            moduleState.purchaseCounts[purchaseCountKey] = decimalUtility.add(currentPurchaseCount, 1).toString();

            coreGameStateManager.setModuleState('market', { ...moduleState });

            loggingSystem.info("MarketLogic", `Purchased ${itemDef.name}. Cost: ${decimalUtility.format(cost)} ${costResource}.`);
            coreUIManager.showNotification(`Acquired 1 ${itemDef.name.includes('Image') ? 'Image' : 'Study Skill Point'}!`, 'success', 2000);
            
            // If images are purchased, explicitly update resource display to ensure it appears if it wasn't visible
            // (though it should be if showInUI is true from its definition)
            if (itemDef.benefitResource === 'images') {
                coreUIManager.updateResourceDisplay();
            }

            if (itemDef.benefitResource === 'studySkillPoints') {
                const skillsModule = moduleLoader.getModule('skills');
                if (skillsModule && skillsModule.logic && typeof skillsModule.logic.isSkillsTabUnlocked === 'function') {
                    // This call will check if SSP >= 1 and set the permanent flag, then render the menu.
                    skillsModule.logic.isSkillsTabUnlocked(); 
                } else {
                    // Fallback to generic menu render if skills module isn't loaded or structured as expected
                    coreUIManager.renderMenu(); 
                }
            }
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
        if (!unlockDef) return true; // If no definition, consider it "not a purchasable item" or already handled.
        
        // This flag indicates if the *market purchase itself* has been made.
        const marketPurchaseFlag = `marketUnlock_${unlockDef.flagToSet}_purchased`;
        return coreGameStateManager.getGlobalFlag(marketPurchaseFlag, false);
    },

    purchaseUnlock(unlockId) { 
        const { coreResourceManager, decimalUtility, loggingSystem, coreGameStateManager, coreUIManager, moduleLoader } = coreSystemsRef;
        const unlockDef = staticModuleData.marketUnlocks[unlockId];

        if (!unlockDef) {
            loggingSystem.error("MarketLogic", `Attempted to purchase unknown unlock: ${unlockId}`);
            return false;
        }

        const marketPurchaseFlag = `marketUnlock_${unlockDef.flagToSet}_purchased`;
        if(coreGameStateManager.getGlobalFlag(marketPurchaseFlag, false)){
            loggingSystem.info("MarketLogic", `${unlockDef.name} market purchase already completed.`);
            coreUIManager.showNotification(`${unlockDef.name.replace('Unlock ','').replace(' Menu','')} already unlocked.`, 'info');
            return false; // Already purchased via market
        }


        const costAmount = decimalUtility.new(unlockDef.costAmount);
        if (coreResourceManager.canAfford(unlockDef.costResource, costAmount)) {
            coreResourceManager.spendAmount(unlockDef.costResource, costAmount);
            
            // Set the *trigger* flag (e.g., 'settingsTabUnlocked') for the target module.
            coreGameStateManager.setGlobalFlag(unlockDef.flagToSet, true);
            // Set the *market purchase confirmation* flag.
            coreGameStateManager.setGlobalFlag(marketPurchaseFlag, true); 

            loggingSystem.info("MarketLogic", `Purchased unlock for ${unlockDef.name}. Trigger flag '${unlockDef.flagToSet}' set. Market purchase flag '${marketPurchaseFlag}' set.`);
            coreUIManager.showNotification(`${unlockDef.name.replace('Unlock ','').replace(' Menu','')} Unlocked!`, 'success', 3000);
            
            // Trigger the unlock check in the target module
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
            loggingSystem.debug("MarketLogic", `Cannot afford ${unlockDef.name}. Need ${decimalUtility.format(costAmount)} ${unlockDef.costResource}.`);
            coreUIManager.showNotification(`Not enough ${unlockDef.costResource} to unlock ${unlockDef.name.replace('Unlock ','').replace(' Menu','')}.`, 'error', 2000);
            return false;
        }
    },

    onGameLoad() {
        const { coreGameStateManager, loggingSystem } = coreSystemsRef;
        loggingSystem.info("MarketLogic", "onGameLoad triggered for Market module (v1.5).");
        let loadedState = coreGameStateManager.getModuleState('market');
        
        // Ensure moduleState.purchaseCounts is properly initialized if loadedState is incomplete
        const initialCounts = getInitialState().purchaseCounts;
        moduleState.purchaseCounts = { ...initialCounts }; 

        if (loadedState && loadedState.purchaseCounts) {
             for (const key in loadedState.purchaseCounts) {
                if (moduleState.purchaseCounts.hasOwnProperty(key)) { // Only load keys that exist in initialCounts
                    moduleState.purchaseCounts[key] = coreSystemsRef.decimalUtility.new(loadedState.purchaseCounts[key] || "0").toString();
                }
            }
        }
        this.isMarketTabUnlocked(); 
    },

    onResetState() {
        const { loggingSystem, coreGameStateManager } = coreSystemsRef;
        loggingSystem.info("MarketLogic", "onResetState triggered for Market module (v1.5).");
        const initialState = getInitialState();
        Object.assign(moduleState, initialState); 
        coreGameStateManager.setModuleState('market', { ...moduleState }); 
        
        coreGameStateManager.setGlobalFlag('marketTabPermanentlyUnlocked', false);
        coreGameStateManager.setGlobalFlag(`marketUnlock_settingsTabUnlocked_purchased`, false);
        coreGameStateManager.setGlobalFlag(`marketUnlock_achievementsTabUnlocked_purchased`, false);

        loggingSystem.info("MarketLogic", "'marketTabPermanentlyUnlocked' and related market purchase flags cleared.");
    }
};
