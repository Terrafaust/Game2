// js/modules/commerce_module/commerce_logic.js 

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
        if (purchasableDef.setsGlobalFlag && coreGameStateManager.getGlobalFlag(purchasableDef.setsGlobalFlag.flag)) {
            loggingSystem.warn("CommerceLogic", `Attempted to purchase already unlocked item: ${purchasableId}`);
            coreUIManager.showNotification(`${purchasableDef.name} already unlocked!`, 'info', 2000);
            return false;
        }

        if (coreResourceManager.canAfford(costResource, cost)) {
            coreResourceManager.spendAmount(costResource, cost);

            // Handle repeatable items (generators)
            if (purchasableDef.costGrowthFactor !== "1") {
                let currentOwned = decimalUtility.new(moduleState.ownedPurchasables[purchasableId] || 0);
                moduleState.ownedPurchasables[purchasableId] = decimalUtility.add(currentOwned, 1).toString(); // Store as string for saving

                // Update total production rate for the resource this item generates (if it's a generator)
                if (purchasableDef.resourceId) {
                    this.updateGeneratorProduction(purchasableId);
                }
            }

            // Handle one-time unlocks that set global flags
            if (purchasableDef.setsGlobalFlag) {
                coreGameStateManager.setGlobalFlag(purchasableDef.setsGlobalFlag.flag, purchasableDef.setsGlobalFlag.value);
                moduleState.unlockedFlags[purchasableDef.setsGlobalFlag.flag] = true; // Update local state for consistency
                loggingSystem.info("CommerceLogic", `Global flag '${purchasableDef.setsGlobalFlag.flag}' set to ${purchasableDef.setsGlobalFlag.value}.`);
                coreUIManager.showNotification(`New content unlocked: ${purchasableDef.name}!`, 'info', 3000);
                coreUIManager.renderMenu(); // Re-render menu to show new tabs
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
     * Updates the total production rate for a specific generator type.
     * This method should be called after purchasing a generator or when production bonuses change.
     * @param {string} generatorId - The ID of the generator (e.g., 'imageGenerator').
     */
    updateGeneratorProduction(generatorId) {
        const { coreResourceManager, decimalUtility, loggingSystem, coreUpgradeManager } = coreSystemsRef;
        const generatorDef = staticModuleData.purchasables[generatorId];

        if (!generatorDef || !generatorDef.resourceId) {
            loggingSystem.error("CommerceLogic", `Generator definition or resourceId not found for ID: ${generatorId} during production update.`);
            return;
        }

        const ownedCount = decimalUtility.new(moduleState.ownedPurchasables[generatorId] || 0);
        const baseProductionPerUnit = decimalUtility.new(generatorDef.baseProduction);

        // Calculate total production from this type of generator
        let totalProduction = decimalUtility.multiply(baseProductionPerUnit, ownedCount);

        // Apply multipliers from CoreUpgradeManager
        const productionMultiplier = coreUpgradeManager.getAggregatedModifier('producer', 'productionMultiplier', generatorId);
        totalProduction = decimalUtility.multiply(totalProduction, productionMultiplier);

        // Set this generator's contribution to the resource manager
        const sourceKey = `commerce_module_${generatorId}`;
        coreResourceManager.setProductionPerSecond(generatorDef.resourceId, sourceKey, totalProduction);

        loggingSystem.debug("CommerceLogic", `Updated production for ${generatorDef.name} (${generatorId}). Total: ${decimalUtility.format(totalProduction)} ${generatorDef.resourceId}/s`);
    },

    /**
     * Calculates and updates the production for all generators in the Commerce module.
     * This should be called on game load and potentially periodically if external multipliers change.
     */
    updateAllGeneratorProductions() {
        for (const purchasableId in staticModuleData.purchasables) {
            const purchasableDef = staticModuleData.purchasables[purchasableId];
            if (purchasableDef.resourceId) { // Only update if it's a resource generator
                this.updateGeneratorProduction(purchasableId);
            }
        }
        coreSystemsRef.loggingSystem.debug("CommerceLogic", "All generator productions updated.");
    },

    /**
     * Checks if a purchasable item is unlocked based on its unlock condition.
     * @param {string} purchasableId - The ID of the purchasable item.
     * @returns {boolean} True if unlocked, false otherwise.
     */
    isPurchasableUnlocked(purchasableId) {
        const { coreResourceManager, decimalUtility, loggingSystem, coreGameStateManager } = coreSystemsRef;
        const purchasableDef = staticModuleData.purchasables[purchasableId];

        if (!purchasableDef || !purchasableDef.unlockCondition) {
            // If no unlock condition, assume it's unlocked by default
            return true;
        }

        const condition = purchasableDef.unlockCondition;

        switch (condition.type) {
            case "resource":
                const currentResourceAmount = coreResourceManager.getAmount(condition.resourceId);
                const requiredResourceAmount = decimalUtility.new(condition.amount);
                return decimalUtility.gte(currentResourceAmount, requiredResourceAmount);
            case "producerOwned": // For conditions based on Studies module producers
                const studiesModule = coreSystemsRef.moduleLoader.getModule('studies');
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
        coreSystemsRef.loggingSystem.info("CommerceLogic", "onGameLoad: Re-calculating all generator productions.");
        this.updateAllGeneratorProductions();
        // No global flags to check *from* this module on load, as they are set *by* this module.
    },

    /**
     * Lifecycle method called when the game resets.
     * Resets module-specific state.
     */
    onResetState() {
        coreSystemsRef.loggingSystem.info("CommerceLogic", "onResetState: Resetting Commerce module logic state.");
        this.updateAllGeneratorProductions(); // Ensure productions are reset to zero
    }
};
