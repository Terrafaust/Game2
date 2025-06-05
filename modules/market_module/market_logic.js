// modules/market_module/market_logic.js (v1)

/**
 * @file market_logic.js
 * @description Business logic for the Market module.
 * Handles purchasing items like Images, Study Skill Points, and unlocking other game features.
 */

import { staticModuleData } from './market_data.js';
import { moduleState } from './market_state.js'; // Reactive state

let coreSystemsRef = null;

export const moduleLogic = {
    /**
     * Initializes the logic component with core system references.
     * @param {object} coreSystems - References to core game systems.
     */
    initialize(coreSystems) {
        coreSystemsRef = coreSystems;
        coreSystemsRef.loggingSystem.info("MarketLogic", "Logic initialized (v1).");
    },

    /**
     * Checks if the Market tab itself should be unlocked.
     * Relies on a global flag set by another module (e.g., Studies).
     * @returns {boolean}
     */
    isMarketTabUnlocked() {
        if (!coreSystemsRef) return false;
        return coreSystemsRef.coreGameStateManager.getGlobalFlag('marketUnlocked', false);
    },

    // --- Purchase Logic for Scalable Items ---

    /**
     * Calculates the current cost for a scalable market item.
     * @param {'buyImages' | 'buyStudySkillPoints'} itemId - The ID of the item from staticModuleData.marketItems.
     * @returns {Decimal} The current cost.
     */
    calculateScalableItemCost(itemId) {
        const { decimalUtility, loggingSystem } = coreSystemsRef;
        const itemDef = staticModuleData.marketItems[itemId];

        if (!itemDef) {
            loggingSystem.error("MarketLogic", `Scalable item definition not found for ID: ${itemId}`);
            return decimalUtility.new(Infinity);
        }

        const baseCost = decimalUtility.new(itemDef.baseCost);
        const costGrowthFactor = decimalUtility.new(itemDef.costGrowthFactor);
        // The key in moduleState.purchaseCounts should match the benefitResource for simplicity
        // or be explicitly defined if different.
        const purchaseCountKey = itemDef.benefitResource; // e.g., 'images', 'studySkillPoints'
        const ownedCount = decimalUtility.new(moduleState.purchaseCounts[purchaseCountKey] || "0");

        return decimalUtility.multiply(baseCost, decimalUtility.power(costGrowthFactor, ownedCount));
    },

    /**
     * Purchases a scalable market item (e.g., Images, Study Skill Points).
     * @param {'buyImages' | 'buyStudySkillPoints'} itemId - The ID of the item.
     * @returns {boolean} True if purchase was successful, false otherwise.
     */
    purchaseScalableItem(itemId) {
        const { coreResourceManager, decimalUtility, loggingSystem, coreGameStateManager } = coreSystemsRef;
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

            // Increment purchase count for this item type to track for cost scaling
            const purchaseCountKey = itemDef.benefitResource;
            let currentPurchaseCount = decimalUtility.new(moduleState.purchaseCounts[purchaseCountKey] || "0");
            moduleState.purchaseCounts[purchaseCountKey] = decimalUtility.add(currentPurchaseCount, 1).toString();

            coreGameStateManager.setModuleState('market', { ...moduleState });

            loggingSystem.info("MarketLogic", `Purchased ${itemDef.name}. Cost: ${decimalUtility.format(cost)} ${costResource}. New total ${itemDef.benefitResource}: ${coreResourceManager.getAmount(itemDef.benefitResource).toString()}`);
            coreUIManager.showNotification(`Acquired 1 ${itemDef.benefitResource === 'images' ? 'Image' : 'Study Skill Point'}!`, 'success', 2000);
            return true;
        } else {
            loggingSystem.debug("MarketLogic", `Cannot afford ${itemDef.name}. Need ${decimalUtility.format(cost)} ${costResource}.`);
            coreUIManager.showNotification(`Not enough ${costResource} for ${itemDef.name}.`, 'error', 2000);
            return false;
        }
    },

    // --- Unlock Logic for Tabs/Features ---

    /**
     * Checks if a specific market unlock can be afforded.
     * @param {'settingsTab' | 'achievementsTab'} unlockId - The ID of the unlock from staticModuleData.marketUnlocks.
     * @returns {boolean}
     */
    canAffordUnlock(unlockId) {
        const { coreResourceManager, decimalUtility } = coreSystemsRef;
        const unlockDef = staticModuleData.marketUnlocks[unlockId];
        if (!unlockDef) return false;

        return coreResourceManager.canAfford(unlockDef.costResource, decimalUtility.new(unlockDef.costAmount));
    },

    /**
     * Checks if a specific unlock has already been purchased (by checking the global flag).
     * @param {'settingsTab' | 'achievementsTab'} unlockId
     * @returns {boolean}
     */
    isUnlockPurchased(unlockId) {
        const { coreGameStateManager } = coreSystemsRef;
        const unlockDef = staticModuleData.marketUnlocks[unlockId];
        if (!unlockDef) return true; // If no definition, assume not applicable or already handled.
        return coreGameStateManager.getGlobalFlag(unlockDef.flagToSet, false);
    },

    /**
     * Purchases a market unlock (e.g., Settings Tab).
     * @param {'settingsTab' | 'achievementsTab'} unlockId - The ID of the unlock.
     * @returns {boolean} True if unlock was successful, false otherwise.
     */
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
            return false; // Already unlocked
        }

        const costAmount = decimalUtility.new(unlockDef.costAmount);
        if (coreResourceManager.canAfford(unlockDef.costResource, costAmount)) {
            coreResourceManager.spendAmount(unlockDef.costResource, costAmount);
            coreGameStateManager.setGlobalFlag(unlockDef.flagToSet, true);

            // No specific module state needed for these simple one-time unlocks,
            // but if there were, update coreGameStateManager.setModuleState('market', { ...moduleState });

            loggingSystem.info("MarketLogic", `Purchased ${unlockDef.name}. Cost: ${decimalUtility.format(costAmount)} ${unlockDef.costResource}. Flag '${unlockDef.flagToSet}' set.`);
            coreUIManager.showNotification(`${unlockDef.name} Unlocked!`, 'success', 3000);
            coreUIManager.renderMenu(); // Re-render main menu to show newly unlocked tab
            return true;
        } else {
            loggingSystem.debug("MarketLogic", `Cannot afford ${unlockDef.name}. Need ${decimalUtility.format(costAmount)} ${unlockDef.costResource}.`);
            coreUIManager.showNotification(`Not enough ${unlockDef.costResource} to unlock ${unlockDef.name}.`, 'error', 2000);
            return false;
        }
    },

    /**
     * Lifecycle method called when the game loads.
     * Ensures module state is correctly loaded.
     */
    onGameLoad() {
        const { coreGameStateManager, loggingSystem } = coreSystemsRef;
        loggingSystem.info("MarketLogic", "onGameLoad triggered for Market module.");
        let loadedState = coreGameStateManager.getModuleState('market');
        if (loadedState && loadedState.purchaseCounts) {
            // Ensure purchaseCounts are Decimals if they were stored as strings
             for (const key in loadedState.purchaseCounts) {
                moduleState.purchaseCounts[key] = coreSystemsRef.decimalUtility.new(loadedState.purchaseCounts[key] || "0").toString();
            }
        } else {
            // If no specific state or malformed, reinitialize relevant parts from default
            const initialState = getInitialState();
            Object.assign(moduleState.purchaseCounts, initialState.purchaseCounts);
        }
        // No further complex logic needed on load for this module currently.
    },

    /**
     * Lifecycle method called when the game resets.
     * Resets module-specific state if any.
     */
    onResetState() {
        const { loggingSystem, coreGameStateManager } = coreSystemsRef;
        loggingSystem.info("MarketLogic", "onResetState triggered for Market module.");
        const initialState = getInitialState();
        Object.assign(moduleState, initialState); // Reset local state
        coreGameStateManager.setModuleState('market', { ...moduleState }); // Persist reset
    }
};
