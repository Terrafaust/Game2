// js/core/coreResourceManager.js (v3)

/**
 * @file coreResourceManager.js
 * @description Manages all game resources (e.g., Study Points, Knowledge),
 * their current amounts, and their generation rates per second.
 * Uses decimalUtility.js for all numerical values.
 */

import { loggingSystem } from './loggingSystem.js';
import { decimalUtility } from './decimalUtility.js';
import { staticDataAggregator } from './staticDataAggregator.js'; // To get resource definitions

// Internal state for resources
// Structure:
// {
//   resourceId: {
//     id: string,
//     name: string, // Display name
//     amount: Decimal,
//     baseProductionRate: Decimal, // Base rate before multipliers
//     productionSources: { // Contributions from various producers or effects
//       sourceKey (e.g., 'studentProducer', 'skillBonus1'): Decimal (production per second from this source)
//     },
//     totalProductionRate: Decimal, // Calculated total rate per second after all sources/multipliers
//     isUnlocked: boolean,
//     showInUI: boolean, // Whether to display this resource in the main resource bar
//     color: string // NEW: CSS color for this resource
//   },
//   ...
// }
let resources = {};

const coreResourceManager = {
    /**
     * Initializes the resource manager, potentially defining initial resources.
     * Resource definitions (name, initial unlock status) should ideally come from staticDataAggregator.
     */
    initialize() {
        resources = {}; // Clear any existing state
        loggingSystem.info("CoreResourceManager", "Resource Manager initialized.");
    },

    /**
     * Defines a new resource or redefines an existing one.
     * @param {string} resourceId - A unique identifier for the resource (e.g., 'studyPoints').
     * @param {string} name - The display name of the resource (e.g., "Study Points").
     * @param {Decimal|number|string} [initialAmount=0] - The starting amount of the resource.
     * @param {boolean} [showInUI=true] - Whether this resource should be shown in the UI by default.
     * @param {boolean} [isUnlocked=true] - Whether this resource is initially unlocked.
     * @param {string} [color='#F3F4F6'] - NEW: The CSS color for this resource (default textPrimary).
     */
    defineResource(resourceId, name, initialAmount = 0, showInUI = true, isUnlocked = true, color = '#F3F4F6') {
        if (typeof resourceId !== 'string' || resourceId.trim() === '') {
            loggingSystem.warn("CoreResourceManager", "defineResource: resourceId must be a non-empty string.");
            return;
        }
        if (resources[resourceId] && resources[resourceId].isInitialized) {
            loggingSystem.debug("CoreResourceManager", `Redefining resource '${resourceId}'.`);
        }

        resources[resourceId] = {
            id: resourceId,
            name: name || "Unnamed Resource",
            amount: decimalUtility.new(initialAmount),
            baseProductionRate: decimalUtility.new(0), // Not actively used if productionSources is primary
            productionSources: {}, // Key: source ID, Value: Decimal (rate from this source)
            totalProductionRate: decimalUtility.new(0),
            isUnlocked: isUnlocked,
            showInUI: showInUI,
            color: color, // NEW: Assign color
            isInitialized: true, // Flag to indicate it has been properly defined
        };
        loggingSystem.info("CoreResourceManager", `Resource '${name}' (${resourceId}) defined. Initial: ${initialAmount}, Unlocked: ${isUnlocked}, ShowInUI: ${showInUI}, Color: ${color}`);
    },

    /**
     * Checks if a resource is defined and initialized.
     * @param {string} resourceId
     * @returns {boolean}
     */
    isResourceDefined(resourceId) {
        return resources[resourceId] && resources[resourceId].isInitialized;
    },

    /**
     * Gets the current amount of a specified resource.
     * @param {string} resourceId - The ID of the resource.
     * @returns {Decimal} The current amount, or Decimal(0) if resource not found or not unlocked.
     */
    getAmount(resourceId) {
        const resource = resources[resourceId];
        if (resource && resource.isUnlocked) {
            return decimalUtility.new(resource.amount); // Return a copy
        }
        return decimalUtility.new(0);
    },

    /**
     * Sets the amount of a specified resource directly. Use with caution.
     * Prefer addAmount or spendAmount for typical game operations.
     * @param {string} resourceId - The ID of the resource.
     * @param {Decimal|number|string} newAmount - The new amount to set.
     * @returns {boolean} True if successful, false otherwise.
     */
    setAmount(resourceId, newAmount) {
        const resource = resources[resourceId];
        if (resource && resource.isUnlocked) {
            const amountToSet = decimalUtility.new(newAmount);
            if (decimalUtility.lt(amountToSet, 0)) {
                resource.amount = decimalUtility.new(0);
            } else {
                resource.amount = amountToSet;
            }
            return true;
        }
        loggingSystem.warn("CoreResourceManager", `setAmount: Resource '${resourceId}' not found or not unlocked.`);
        return false;
    },

    /**
     * Adds an amount to a specified resource.
     * @param {string} resourceId - The ID of the resource.
     * @param {Decimal|number|string} amountToAdd - The amount to add (must be non-negative).
     * @returns {boolean} True if successful, false otherwise.
     */
    addAmount(resourceId, amountToAdd) {
        const resource = resources[resourceId];
        const decAmountToAdd = decimalUtility.new(amountToAdd);

        if (decimalUtility.lt(decAmountToAdd, 0)) {
            loggingSystem.warn("CoreResourceManager", `addAmount: Cannot add negative value to '${resourceId}'. Use spendAmount instead.`);
            return false;
        }
        if (resource && resource.isUnlocked) {
            resource.amount = decimalUtility.add(resource.amount, decAmountToAdd);
            return true;
        }
        loggingSystem.warn("CoreResourceManager", `addAmount: Resource '${resourceId}' not found or not unlocked.`);
        return false;
    },

    /**
     * Checks if there is enough of a resource to spend.
     * @param {string} resourceId - The ID of the resource.
     * @param {Decimal|number|string} amountToSpend - The amount needed.
     * @returns {boolean} True if affordable, false otherwise.
     */
    canAfford(resourceId, amountToSpend) {
        const resource = resources[resourceId];
        const decAmountToSpend = decimalUtility.new(amountToSpend);

        if (decimalUtility.lt(decAmountToSpend, 0)) return true; // Spending negative is always "affordable" (but shouldn't happen)
        if (resource && resource.isUnlocked) {
            return decimalUtility.gte(resource.amount, decAmountToSpend);
        }
        return false;
    },

    /**
     * Spends (subtracts) an amount of a specified resource.
     * Will not allow the resource amount to go below zero unless allowNegative is true.
     * @param {string} resourceId - The ID of the resource.
     * @param {Decimal|number|string} amountToSpend - The amount to spend (must be non-negative).
     * @param {boolean} [allowNegative=false] - If true, allows amount to go below zero.
     * @returns {boolean} True if the spending was successful (or affordable), false otherwise.
     */
    spendAmount(resourceId, amountToSpend, allowNegative = false) {
        const resource = resources[resourceId];
        const decAmountToSpend = decimalUtility.new(amountToSpend);

        if (decimalUtility.lt(decAmountToSpend, 0)) {
            loggingSystem.warn("CoreResourceManager", `spendAmount: Cannot spend negative value for '${resourceId}'. Use addAmount instead.`);
            return false;
        }

        if (resource && resource.isUnlocked) {
            if (decimalUtility.gte(resource.amount, decAmountToSpend) || allowNegative) {
                resource.amount = decimalUtility.subtract(resource.amount, decAmountToSpend);
                if (!allowNegative && decimalUtility.lt(resource.amount, 0)) {
                    resource.amount = decimalUtility.new(0); // Clamp to zero if not allowed to be negative
                }
                return true;
            } else {
                return false;
            }
        }
        loggingSystem.warn("CoreResourceManager", `spendAmount: Resource '${resourceId}' not found or not unlocked.`);
        return false;
    },

    /**
     * Sets or updates the production rate for a resource from a specific source.
     * The total production rate for the resource will be the sum of all its sources.
     * @param {string} resourceId - The ID of the resource to affect.
     * @param {string} sourceKey - A unique key identifying the producer/source (e.g., 'studentProducer', 'skill_autoStudy').
     * @param {Decimal|number|string} productionPerSecond - The rate this source contributes.
     */
    setProductionPerSecond(resourceId, sourceKey, productionPerSecond) {
        const resource = resources[resourceId];
        if (!resource || !resource.isUnlocked) {
            loggingSystem.warn("CoreResourceManager", `setProductionPerSecond: Resource '${resourceId}' not found or not unlocked.`);
            return;
        }
        if (typeof sourceKey !== 'string' || sourceKey.trim() === '') {
            loggingSystem.warn("CoreResourceManager", `setProductionPerSecond: sourceKey for '${resourceId}' must be a non-empty string.`);
            return;
        }
        resource.productionSources[sourceKey] = decimalUtility.new(productionPerSecond);
        this._recalculateTotalProductionRate(resourceId);
    },

    /**
     * Gets the production rate from a specific source for a resource.
     * @param {string} resourceId
     * @param {string} sourceKey
     * @returns {Decimal} Production rate from this source, or Decimal(0) if not found.
     */
    getProductionFromSource(resourceId, sourceKey) {
        const resource = resources[resourceId];
        if (resource && resource.productionSources && Object.prototype.hasOwnProperty.call(resource.productionSources, sourceKey)) {
            return decimalUtility.new(resource.productionSources[sourceKey]); // Return a copy
        }
        return decimalUtility.new(0);
    },

    /**
     * Recalculates the total production rate for a given resource by summing all its sources.
     * This should be called whenever a source's contribution changes.
     * @param {string} resourceId - The ID of the resource.
     * @private
     */
    _recalculateTotalProductionRate(resourceId) {
        const resource = resources[resourceId];
        if (!resource) return;

        let totalRate = decimalUtility.new(0);
        for (const sourceKey in resource.productionSources) {
            totalRate = decimalUtility.add(totalRate, resource.productionSources[sourceKey]);
        }
        resource.totalProductionRate = totalRate;
    },

    /**
     * Gets the total calculated production rate per second for a specified resource.
     * @param {string} resourceId - The ID of the resource.
     * @returns {Decimal} The total production rate, or Decimal(0) if resource not found.
     */
    getTotalProductionRate(resourceId) {
        const resource = resources[resourceId];
        if (resource && resource.isUnlocked) {
            return decimalUtility.new(resource.totalProductionRate); // Return a copy
        }
        return decimalUtility.new(0);
    },

    /**
     * Updates resource amounts based on their production rates and deltaTime.
     * Called by the game loop.
     * @param {number} deltaTimeSeconds - The time elapsed since the last update, in seconds.
     */
    updateResourceProduction(deltaTimeSeconds) {
        const decDeltaTime = decimalUtility.new(deltaTimeSeconds);
        for (const resourceId in resources) {
            const resource = resources[resourceId];
            if (resource.isUnlocked && decimalUtility.gt(resource.totalProductionRate, 0)) {
                const amountGenerated = decimalUtility.multiply(resource.totalProductionRate, decDeltaTime);
                resource.amount = decimalUtility.add(resource.amount, amountGenerated);
            }
        }
    },

    /**
     * Unlocks a resource, making it visible and usable.
     * @param {string} resourceId
     */
    unlockResource(resourceId) {
        const resource = resources[resourceId];
        if (resource) {
            if (!resource.isUnlocked) {
                resource.isUnlocked = true;
                loggingSystem.info("CoreResourceManager", `Resource '${resource.name}' (${resourceId}) unlocked.`);
            }
        } else {
            loggingSystem.warn("CoreResourceManager", `unlockResource: Cannot unlock '${resourceId}', not defined.`);
        }
    },

    /**
     * Sets whether a resource should be shown in the UI.
     * @param {string} resourceId
     * @param {boolean} show
     */
    setResourceVisibility(resourceId, show) {
        const resource = resources[resourceId];
        if (resource) {
            resource.showInUI = !!show;
            loggingSystem.debug("CoreResourceManager", `Resource '${resourceId}' UI visibility set to ${resource.showInUI}.`);
        }
    },

    /**
     * Retrieves all defined resources and their current state.
     * Primarily for UI display or debugging.
     * @returns {object} A copy of the internal resources object. Keys are resource IDs.
     */
    getAllResources() {
        const resourcesCopy = {};
        for (const resId in resources) {
            const original = resources[resId];
            resourcesCopy[resId] = {
                ...original,
                amount: decimalUtility.new(original.amount),
                baseProductionRate: decimalUtility.new(original.baseProductionRate),
                totalProductionRate: decimalUtility.new(original.totalProductionRate),
                productionSources: { ...original.productionSources },
            };
            for (const srcKey in resourcesCopy[resId].productionSources) {
                resourcesCopy[resId].productionSources[srcKey] = decimalUtility.new(original.productionSources[srcKey]);
            }
        }
        return resourcesCopy;
    },

    /**
     * Gets the color associated with a specific resource.
     * @param {string} resourceId - The ID of the resource.
     * @returns {string} The CSS color string, or a default if not found.
     */
    getResourceColor(resourceId) {
        const resource = resources[resourceId];
        return resource ? resource.color : '#F3F4F6'; // Default to textPrimary if not found
    },

    /**
     * Resets all resource amounts and production rates to their initial defined states or zero.
     * Called on a hard game reset.
     */
    resetState() {
        loggingSystem.info("CoreResourceManager", "Resetting all resource states...");
        for (const resourceId in resources) {
            const resource = resources[resourceId];
            const staticDefs = staticDataAggregator.getData(`core_resource_definitions.${resourceId}`) || staticDataAggregator.getData(`studies.resources.${resourceId}`) || staticDataAggregator.getData(`commerce.resources.${resourceId}`); // Check all known static data sources
            
            // Reset amount to initial or 0
            resource.amount = decimalUtility.new(staticDefs ? staticDefs.initialAmount : 0);
            resource.productionSources = {};
            resource.totalProductionRate = decimalUtility.new(0);
            // Reset unlocked/showInUI status based on static definitions
            resource.isUnlocked = staticDefs ? (staticDefs.isUnlocked || false) : false;
            resource.showInUI = staticDefs ? (staticDefs.showInUI || false) : false;
        }
        loggingSystem.info("CoreResourceManager", "All resource states reset.");
    },

    /**
     * Prepares resource data for saving.
     * Converts Decimal amounts and rates to string representations.
     * @returns {object} An object containing resource data suitable for JSON serialization.
     */
    getSaveData() {
        const saveData = {};
        for (const resourceId in resources) {
            const res = resources[resourceId];
            saveData[resourceId] = {
                id: res.id,
                name: res.name,
                amount: res.amount.toString(),
                productionSources: {},
                isUnlocked: res.isUnlocked,
                showInUI: res.showInUI,
                color: res.color // Save color as well
            };
            for (const srcKey in res.productionSources) {
                saveData[resourceId].productionSources[srcKey] = res.productionSources[srcKey].toString();
            }
        }
        return saveData;
    },

    /**
     * Loads resource data from a save object.
     * Converts string representations of Decimals back to Decimal objects.
     * @param {object} saveData - The resource data loaded from a save file.
     */
    loadSaveData(saveData) {
        if (!saveData) {
            loggingSystem.warn("CoreResourceManager", "loadSaveData: No save data provided.");
            this.resetState();
            return;
        }

        for (const resourceId in saveData) {
            const savedRes = saveData[resourceId];
            if (!this.isResourceDefined(resourceId)) {
                loggingSystem.warn("CoreResourceManager", `Loading undefined resource '${resourceId}' from save. Defining with saved values.`);
                this.defineResource(
                    resourceId,
                    savedRes.name || resourceId,
                    savedRes.amount || 0,
                    savedRes.showInUI !== undefined ? savedRes.showInUI : true,
                    savedRes.isUnlocked !== undefined ? savedRes.isUnlocked : false,
                    savedRes.color || '#F3F4F6' // Load color, or default
                );
            }
            
            const liveResource = resources[resourceId];
            if (liveResource) {
                liveResource.amount = decimalUtility.new(savedRes.amount);
                liveResource.isUnlocked = savedRes.isUnlocked !== undefined ? savedRes.isUnlocked : liveResource.isUnlocked;
                liveResource.showInUI = savedRes.showInUI !== undefined ? savedRes.showInUI : liveResource.showInUI;
                liveResource.color = savedRes.color || liveResource.color; // Update color from save

                liveResource.productionSources = {};
                if (savedRes.productionSources) {
                    for (const srcKey in savedRes.productionSources) {
                        liveResource.productionSources[srcKey] = decimalUtility.new(savedRes.productionSources[srcKey]);
                    }
                }
                this._recalculateTotalProductionRate(resourceId);
            }
        }
        loggingSystem.info("CoreResourceManager", "Resource data loaded from save.");
    }
};

// Initialize the resource manager when the script loads.
coreResourceManager.initialize();

export { coreResourceManager };
