// modules/market_module/market_logic.js (v1.5 - Unlock Skills Tab Fix & Resource Display)

/**
 * @file market_logic.js
 * @description Business logic for the Market module.
 * v1.5: Ensures 'skillsTabUnlocked' global flag is set on SSP purchase and
 * that 'images' resource is properly marked as unlocked.
 * v1.4: Ensures 'marketTabPermanentlyUnlocked' flag is cleared on reset and checks it correctly.
 */

import { staticModuleData } from './market_data.js';
import { moduleState } from './market_state.js'; 

let coreSystemsRef = null;

export const moduleLogic = {
    initialize(coreSystems) {
        coreSystemsRef = coreSystems;
        coreSystemsRef.loggingSystem.info("MarketLogic", "Logic initialized (v1.5).");
    },

    isMarketTabUnlocked() {
        if (!coreSystemsRef || !coreSystemsRef.coreGameStateManager) {
            console.error("MarketLogic_isMarketTabUnlocked_CRITICAL: coreGameStateManager missing!");
            return true; // Default to true to avoid hiding content on error
        }
        const { coreGameStateManager, coreUIManager, loggingSystem } = coreSystemsRef;

        if (coreGameStateManager.getGlobalFlag('marketTabPermanentlyUnlocked', false)) {
            return true;
        }
        const conditionMet = coreGameStateManager.getGlobalFlag('marketUnlocked', false); // Original unlock trigger
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
            coreResourceManager.addAmount(itemDef.benefitResource, decimalUtility.new(itemDef.benefitAmountPerPurchase));

            const purchaseCountKey = itemDef.benefitResource;
            let currentPurchaseCount = decimalUtility.new(moduleState.purchaseCounts[purchaseCountKey] || "0");
            moduleState.purchaseCounts[purchaseCountKey] = decimalUtility.add(currentPurchaseCount, 1).toString();

            coreGameStateManager.setModuleState('market', { ...moduleState });

            loggingSystem.info("MarketLogic", `Purchased ${itemDef.name}. Cost: ${decimalUtility.format(cost)} ${costResource}.`);
            coreUIManager.showNotification(`Acquired 1 ${itemDef.benefitResource === 'images' ? 'Image' : 'Study Skill Point'}!`, 'success', 2000);

            // --- BEGIN Skills Tab Unlock Fix ---
            if (itemDef.benefitResource === 'studySkillPoints') {
                // Check if the skills tab is not already permanently unlocked
                if (!coreGameStateManager.getGlobalFlag('skillsTabPermanentlyUnlocked', false)) {
                    // Set the trigger flag for the skills module
                    coreGameStateManager.setGlobalFlag('skillsTabUnlocked', true);
                    loggingSystem.info("MarketLogic", "Global flag 'skillsTabUnlocked' set to true.");

                    const skillsModule = moduleLoader.getModule('skills');
                    if (skillsModule && skillsModule.logic && typeof skillsModule.logic.isSkillsTabUnlocked === 'function') {
                        // Calling this will make skills_logic.js set 'skillsTabPermanentlyUnlocked'
                        // and render the menu if it's not already visible.
                        skillsModule.logic.isSkillsTabUnlocked(); 
                    } else {
                        // Fallback: If skills module logic isn't ready for some reason, just try to re-render menu
                        coreUIManager.renderMenu(); 
                    }
                }
            }
            // --- END Skills Tab Unlock Fix ---

            // --- BEGIN Images Resource Unlock Fix ---
            // Ensure the 'images' resource is marked as unlocked in coreResourceManager
            // even if market_data.js says isUnlocked: true.
            // This is crucial for it to appear in the general resource display.
            if (itemDef.benefitResource === 'images') {
                coreResourceManager.unlockResource('images');
                coreUIManager.updateResourceDisplay(); // Force refresh resource display
            }
            // --- END Images Resource Unlock Fix ---

            coreUIManager.updateActiveTabContent(); // Ensure current tab content is updated
            return true;
        } else {
            loggingSystem.debug("MarketLogic", `Cannot afford ${itemDef.name}. Need ${decimalUtility.format(cost)} ${costResource}.`);
            coreUIManager.showNotification(`Not enough ${costResource} for ${itemDef.name}.`, 'error', 2000);
            return false;
        }
    },

    canAffordUnlock(unlockId) { // unlockId is 'settingsTab', 'achievementsTab'
        const { coreResourceManager, decimalUtility } = coreSystemsRef;
        const unlockDef = staticModuleData.marketUnlocks[unlockId];
        if (!unlockDef) return false;
        return coreResourceManager.canAfford(unlockDef.costResource, decimalUtility.new(unlockDef.costAmount));
    },

    isUnlockPurchased(unlockId) { // unlockId is 'settingsTab', 'achievementsTab'
        const { coreGameStateManager } = coreSystemsRef;
        // The permanent flags are set by the respective modules (settings, achievements) when their own unlock condition is met
        // Market module should check if the *initial* unlock via images has been done
        // However, for UI display purposes (e.g. "Unlocked" button), checking the permanent flag is fine if it exists
        if (unlockId === 'settingsTab') {
            return coreGameStateManager.getGlobalFlag('settingsTabPermanentlyUnlocked', false);
        }
        if (unlockId === 'achievementsTab') {
            return coreGameStateManager.getGlobalFlag('achievementsTabPermanentlyUnlocked', false);
        }
        // Fallback if no permanent flag defined for this type of unlock yet
        const unlockDef = staticModuleData.marketUnlocks[unlockId];
        if (!unlockDef) return true;
        // This is the flag that the market purchase sets to indicate it's been bought.
        return coreGameStateManager.getGlobalFlag(`marketUnlock_${unlockDef.flagToSet}_purchased`, false);
    },

    purchaseUnlock(unlockId) { // unlockId is 'settingsTab', 'achievementsTab'
        const { coreResourceManager, decimalUtility, loggingSystem, coreGameStateManager, coreUIManager, moduleLoader } = coreSystemsRef;
        const unlockDef = staticModuleData.marketUnlocks[unlockId];

        if (!unlockDef) {
            loggingSystem.error("MarketLogic", `Attempted to purchase unknown unlock: ${unlockId}`);
            return false;
        }

        // Use a more specific check. The market logic should check its own unlock purchase state.
        // The permanent flags are for the tabs themselves, set by their own modules.
        // Let's assume a flag like 'marketUnlock_${unlockId}_purchased'
        const marketPurchaseFlag = `marketUnlock_${unlockDef.flagToSet}_purchased`;
        if(coreGameStateManager.getGlobalFlag(marketPurchaseFlag, false)){
            loggingSystem.info("MarketLogic", `${unlockDef.name} market purchase already completed.`);
            coreUIManager.showNotification(`${unlockDef.name} already unlocked via market.`, 'info');
            return false;
        }


        const costAmount = decimalUtility.new(unlockDef.costAmount);
        if (coreResourceManager.canAfford(unlockDef.costResource, costAmount)) {
            coreResourceManager.spendAmount(unlockDef.costResource, costAmount);
            
            // Set the *trigger* flag (e.g., 'settingsTabUnlocked')
            // The respective module (settings, achievements) will pick this up and set its *permanent* flag.
            coreGameStateManager.setGlobalFlag(unlockDef.flagToSet, true);
            coreGameStateManager.setGlobalFlag(marketPurchaseFlag, true); // Mark this specific market purchase as done.

            loggingSystem.info("MarketLogic", `Purchased unlock for ${unlockDef.name}. Flag '${unlockDef.flagToSet}' set.`);
            coreUIManager.showNotification(`${unlockDef.name} Unlocked from Market!`, 'success', 3000);
            
            // Trigger the unlock check in the target module
            if (unlockId === 'settingsTab') {
                const settingsModule = moduleLoader.getModule('settings_ui');
                if (settingsModule && settingsModule.logic && settingsModule.logic.isSettingsTabUnlocked) {
                    settingsModule.logic.isSettingsTabUnlocked(); // This will set permanent flag & render menu
                } else { coreUIManager.renderMenu(); }
            } else if (unlockId === 'achievementsTab') {
                 const achievementsModule = moduleLoader.getModule('achievements');
                if (achievementsModule && achievementsModule.logic && achievementsModule.logic.isAchievementsTabUnlocked) {
                    achievementsModule.logic.isAchievementsTabUnlocked(); // This will set permanent flag & render menu
                } else { coreUIManager.renderMenu(); }
            } else {
                 coreUIManager.renderMenu(); // Generic refresh if specific module not handled
            }
            coreUIManager.updateActiveTabContent(); // Ensure current tab content is updated
            return true;
        } else {
            loggingSystem.debug("MarketLogic", `Cannot afford ${unlockDef.name}. Need ${decimalUtility.format(costAmount)} ${unlockDef.costResource}.`);
            coreUIManager.showNotification(`Not enough ${unlockDef.costResource} to unlock ${unlockDef.name}.`, 'error', 2000);
            return false;
        }
    },

    onGameLoad() {
        const { coreGameStateManager, loggingSystem } = coreSystemsRef;
        loggingSystem.info("MarketLogic", "onGameLoad triggered for Market module (v1.5)."); // Version update
        let loadedState = coreGameStateManager.getModuleState('market');
        if (loadedState && loadedState.purchaseCounts) {
             for (const key in loadedState.purchaseCounts) {
                moduleState.purchaseCounts[key] = coreSystemsRef.decimalUtility.new(loadedState.purchaseCounts[key] || "0").toString();
            }
        } else {
            const initialState = getInitialState();
            Object.assign(moduleState.purchaseCounts, initialState.purchaseCounts);
        }
        this.isMarketTabUnlocked(); 
    },

    onResetState() {
        const { loggingSystem, coreGameStateManager } = coreSystemsRef;
        loggingSystem.info("MarketLogic", "onResetState triggered for Market module (v1.5)."); // Version update
        const initialState = getInitialState();
        Object.assign(moduleState, initialState); 
        coreGameStateManager.setModuleState('market', { ...moduleState }); 
        
        coreGameStateManager.setGlobalFlag('marketTabPermanentlyUnlocked', false);
        // Clear flags related to *market purchases* of other tab unlocks
        coreGameStateManager.setGlobalFlag(`marketUnlock_settingsTabUnlocked_purchased`, false);
        coreGameStateManager.setGlobalFlag(`marketUnlock_achievementsTabUnlocked_purchased`, false);

        loggingSystem.info("MarketLogic", "'marketTabPermanentlyUnlocked' and related market purchase flags cleared.");
    }
};

