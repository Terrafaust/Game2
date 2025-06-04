// js/modules/commerce_module/commerce_logic.js (v4)

/**
 * @file commerce_logic.js
 * @description Contains the business logic for the Commerce module,
 * handling purchases of Images, Study Skill Points, and menu unlocks.
 */

import { staticModuleData } from './commerce_data.js';
import { moduleState } from './commerce_state.js';

let coreSystemsRef = null; // To store references to core game systems

export const moduleLogic = {
    /**
     * Initializes the logic component with core system references.
     * @param {object} coreSystems - References to core game systems.
     */
    initialize(coreSystems) {
        coreSystemsRef = coreSystems;
        coreSystemsRef.loggingSystem.debug("CommerceLogic", "Logic initialized.");
    },

    /**
     * Calculates the current cost of a purchasable item.
     * Formula: baseCost * (costGrowthFactor ^ ownedCount) for repeatable items.
     * For one-time unlocks, it's just baseCost.
     * @param {string} purchasableId - The ID of the purchasable item.
     * @returns {Decimal} The current cost of the item.
     */
    calculatePurchasableCost(purchasableId) {
        const { decimalUtility, loggingSystem } = coreSystemsRef;
        const purchasableDef = staticModuleData.purchasables[purchasableId];

        if (!purchasableDef) {
            loggingSystem.error("CommerceLogic", `Purchasable definition not found for ID: ${purchasableId}`);
            return decimalUtility.new(Infinity); // Return a very high cost if not found
        }

        const baseCost = decimalUtility.new(purchasableDef.baseCost);
        const costGrowthFactor = decimalUtility.new(purchasableDef.costGrowthFactor);

        // For one-time purchases (costGrowthFactor === "1"), ownedCount doesn't affect cost.
        // For repeatable purchases, use ownedCount.
        let ownedCount = decimalUtility.ZERO;
        if (purchasableDef.costGrowthFactor !== "1") {
            ownedCount = decimalUtility.new(moduleState.ownedPurchasables[purchasableId] || 0);
        }

        // Cost = baseCost * (costGrowthFactor ^ ownedCount)
        const currentCost = decimalUtility.multiply(
            baseCost,
            decimalUtility.power(costGrowthFactor, ownedCount)
        );

        return currentCost;
    },

    /**
     * Handles the purchase of an item.
     * @param {string} purchasableId - The ID of the item to purchase.
     * @returns {boolean} True if purchase was successful, false otherwise.
     */
    purchaseItem(purchasableId) {
        if (!coreSystemsRef) {
            console.error("CommerceLogic: Core systems not initialized.");
            return false;
        }

        const { coreResourceManager, decimalUtility, loggingSystem, coreGameStateManager, coreUIManager } = coreSystemsRef;
        const purchasableDef = staticModuleData.purchasables[purchasableId];

        if (!purchasableDef) {
            loggingSystem.error("CommerceLogic", `Attempted to purchase unknown item: ${purchasableId}`);
            return false;
        }

        const cost = this.calculatePurchasableCost(purchasableId);
        const costResource = purchasableDef.costResource;

        // Check if it's a one-time unlock and already purchased (flag set)
        if (purchasableDef.type === "flagUnlock" && coreGameStateManager.getGlobalFlag(purchasableDef.setsGlobalFlag.flag)) {
            loggingSystem.warn("CommerceLogic", `Attempted to purchase already unlocked item: ${purchasableId}`);
            coreUIManager.showNotification(`${purchasableDef.name} already unlocked!`, 'info', 2000);
            return false;
        }

        if (coreResourceManager.canAfford(costResource, cost)) {
            coreResourceManager.spendAmount(costResource, cost);

            // Handle repeatable items (e.g., if we re-introduce passive generators)
            if (purchasableDef.costGrowthFactor !== "1") {
                let currentOwned = decimalUtility.new(moduleState.ownedPurchasables[purchasableId] || 0);
                moduleState.ownedPurchasables[purchasableId] = decimalUtility.add(currentOwned, 1).toString(); // Store as string for saving
            }

            // NEW: Handle resourceGain type
            if (purchasableDef.type === "resourceGain") {
                coreResourceManager.addAmount(purchasableDef.gainResourceId, decimalUtility.new(purchasableDef.gainAmount));
                loggingSystem.info("CommerceLogic", `Gained ${purchasableDef.gainAmount} ${purchasableDef.gainResourceId} from purchasing ${purchasableDef.name}.`);

                // NEW: Unlock resource and show in UI if it's 'images'
                if (purchasableDef.gainResourceId === 'images') {
                    coreResourceManager.unlockResource('images');
                    coreResourceManager.setResourceVisibility('images', true);
                }
                // NEW: Unlock Skills menu if it's the first studySkillPoint
                if (purchasableDef.gainResourceId === 'studySkillPoints' && decimalUtility.eq(coreResourceManager.getAmount('studySkillPoints'), decimalUtility.new(purchasableDef.gainAmount))) {
                    coreResourceManager.unlockResource('studySkillPoints'); // Unlock the resource itself
                    // No need to set visibility for studySkillPoints as it's explicitly hidden in data
                    coreSystemsRef.coreUIManager.renderMenu(); // Re-render to show Skills tab
                }
            }

            // Handle one-time unlocks that set global flags
            if (purchasableDef.type === "flagUnlock" && purchasableDef.setsGlobalFlag) {
                coreGameStateManager.setGlobalFlag(purchasableDef.setsGlobalFlag.flag, purchasableDef.setsGlobalFlag.value);
                moduleState.unlockedFlags[purchasableDef.setsGlobalFlag.flag] = true; // Update local state for consistency
                loggingSystem.info("CommerceLogic", `Global flag '${purchasableDef.setsGlobalFlag.flag}' set to ${purchasableDef.setsGlobalFlag.value}.`);
                coreUIManager.showNotification(`New content unlocked: ${purchasableDef.name}!`, 'info', 3000);
                coreUIManager.renderMenu(); // Re-render menu to show new tabs (Settings/Achievements)
            }

            // Persist the updated module state to the global game state
            coreGameStateManager.setModuleState('commerce', { ...moduleState });

            loggingSystem.info("CommerceLogic", `Purchased ${purchasableDef.name}. Cost: ${decimalUtility.format(cost)} ${costResource}.`);
            return true;
        } else {
            loggingSystem.debug("CommerceLogic", `Cannot afford ${purchasableDef.name}. Need ${decimalUtility.format(cost)} ${costResource}. Have ${decimalUtility.format(coreResourceManager.getAmount(costResource))}`);
            return false;
        }
    },

    /**
     * Checks if a purchasable item is unlocked based on its unlock condition.
     * @param {string} purchasableId - The ID of the purchasable item.
     * @returns {boolean} True if unlocked, false otherwise.
     */
    isPurchasableUnlocked(purchasableId) {
        const { coreResourceManager, decimalUtility, loggingSystem, coreGameStateManager, moduleLoader } = coreSystemsRef;
        const purchasableDef = staticModuleData.purchasables[purchasableId];

        if (!purchasableDef || !purchasableDef.unlockCondition) {
            // If no unlock condition, assume it's unlocked by default
            return true;
        }

        // NEW: For flagUnlock types, if the flag is already set, it's "unlocked" and shouldn't be purchasable again.
        if (purchasableDef.type === "flagUnlock" && coreGameStateManager.getGlobalFlag(purchasableDef.setsGlobalFlag.flag)) {
            return true; // Already purchased/unlocked
        }

        const condition = purchasableDef.unlockCondition;

        switch (condition.type) {
            case "resource":
                const currentResourceAmount = coreResourceManager.getAmount(condition.resourceId);
                const requiredResourceAmount = decimalUtility.new(condition.amount);
                return decimalUtility.gte(currentResourceAmount, requiredResourceAmount);
            case "producerOwned": // For conditions based on Studies module producers
                const studiesModule = moduleLoader.getModule('studies');
                if (studiesModule && studiesModule.logic && typeof studiesModule.logic.getOwnedProducerCount === 'function') {
                    const ownedCount = studiesModule.logic.getOwnedProducerCount(condition.producerId);
                    const requiredCount = decimalUtility.new(condition.count);
                    return decimalUtility.gte(ownedCount, requiredCount);
                } else {
                    loggingSystem.warn("CommerceLogic", `Studies module or its logic not available for producerOwned condition for ${purchasableId}.`);
                    return false;
                }
            case "globalFlag":
                return coreGameStateManager.getGlobalFlag(condition.flag) === condition.value;
            default:
                loggingSystem.warn("CommerceLogic", `Unknown unlock condition type for purchasable ${purchasableId}: ${condition.type}`);
                return false;
        }
    },

    /**
     * Gets the current owned count for a specific purchasable (generator).
     * @param {string} purchasableId - The ID of the purchasable.
     * @returns {Decimal} The owned count as a Decimal.
     */
    getOwnedPurchasableCount(purchasableId) {
        const { decimalUtility } = coreSystemsRef;
        return decimalUtility.new(moduleState.ownedPurchasables[purchasableId] || 0);
    },

    /**
     * Checks if the Commerce tab itself should be unlocked.
     * @returns {boolean}
     */
    isCommerceTabUnlocked() {
        const { coreGameStateManager } = coreSystemsRef;
        const condition = staticModuleData.ui.commerceTabUnlockCondition;

        if (!condition) {
            return true; // Always unlocked if no condition defined
        }

        if (condition.type === "globalFlag") {
            return coreGameStateManager.getGlobalFlag(condition.flag) === condition.value;
        }
        return false;
    },

    /**
     * Lifecycle method called when the game loads.
     * Ensures all production rates are correctly set based on loaded state.
     */
    onGameLoad() {
        coreSystemsRef.loggingSystem.info("CommerceLogic", "onGameLoad: Commerce module loaded.");
        // No generators to update production for anymore, as they are one-time gains.
        // But ensure resources like Images and Study Skill Points are unlocked if they were acquired.
        const { coreResourceManager } = coreSystemsRef;
        if (coreResourceManager.getAmount('images').gt(0)) {
            coreResourceManager.unlockResource('images');
            coreResourceManager.setResourceVisibility('images', true);
        }
        if (coreResourceManager.getAmount('studySkillPoints').gt(0)) {
            coreResourceManager.unlockResource('studySkillPoints');
            // studySkillPoints is explicitly hidden from UI, so no setResourceVisibility(true) here.
        }
    },

    /**
     * Lifecycle method called when the game resets.
     * Resets module-specific state.
     */
    onResetState() {
        coreSystemsRef.loggingSystem.info("CommerceLogic", "onResetState: Resetting Commerce module logic state.");
        // No productions to reset, as they are one-time gains.
    }
};
