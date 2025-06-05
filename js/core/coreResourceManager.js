// js/core/coreResourceManager.js (v1.1 - Add getResource, remove self-init)

/**
 * @file coreResourceManager.js
 * @description Manages all game resources (e.g., Study Points, Knowledge),
 * their current amounts, and their generation rates per second.
 * Uses decimalUtility.js for all numerical values.
 * v1.1: Added getResource method and removed self-initialization.
 */

import { loggingSystem } from './loggingSystem.js';
import { decimalUtility } from './decimalUtility.js';
import { staticDataAggregator } from './staticDataAggregator.js';

let resources = {};

const coreResourceManager = {
    initialize() {
        resources = {}; // Clear any existing state
        loggingSystem.info("CoreResourceManager", "Resource Manager initialized (v1.1).");
    },

    defineResource(resourceId, name, initialAmount = 0, showInUI = true, isUnlocked = true, hasProductionRate = true) {
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
            productionSources: {},
            totalProductionRate: decimalUtility.new(0),
            isUnlocked: isUnlocked,
            showInUI: showInUI,
            hasProductionRate: hasProductionRate, // Store this info
            isInitialized: true,
        };
        loggingSystem.info("CoreResourceManager", `Resource '${name}' (${resourceId}) defined. Initial: ${initialAmount}, Unlocked: ${isUnlocked}, ShowInUI: ${showInUI}, HasRate: ${hasProductionRate}`);
    },

    isResourceDefined(resourceId) {
        return resources[resourceId] && resources[resourceId].isInitialized;
    },

    /**
     * Gets the full resource object for a specified resource ID.
     * Returns a deep copy if found, otherwise null.
     * @param {string} resourceId - The ID of the resource.
     * @returns {object|null} A copy of the resource object or null.
     */
    getResource(resourceId) {
        const resource = resources[resourceId];
        if (resource && resource.isInitialized) {
            // Return a deep copy to prevent external modification of internal state
            const resourceCopy = {
                ...resource,
                amount: decimalUtility.new(resource.amount),
                totalProductionRate: decimalUtility.new(resource.totalProductionRate),
                productionSources: { ...resource.productionSources },
            };
            for (const srcKey in resourceCopy.productionSources) {
                resourceCopy.productionSources[srcKey] = decimalUtility.new(resource.productionSources[srcKey]);
            }
            return resourceCopy;
        }
        loggingSystem.debug("CoreResourceManager", `getResource: Resource '${resourceId}' not found.`);
        return null;
    },

    getAmount(resourceId) {
        const resource = resources[resourceId];
        if (resource && resource.isUnlocked) {
            return decimalUtility.new(resource.amount);
        }
        return decimalUtility.new(0);
    },

    setAmount(resourceId, newAmount) {
        const resource = resources[resourceId];
        if (resource && resource.isUnlocked) {
            const amountToSet = decimalUtility.new(newAmount);
            resource.amount = decimalUtility.lt(amountToSet, 0) ? decimalUtility.new(0) : amountToSet;
            return true;
        }
        loggingSystem.warn("CoreResourceManager", `setAmount: Resource '${resourceId}' not found or not unlocked.`);
        return false;
    },

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

    canAfford(resourceId, amountToSpend) {
        const resource = resources[resourceId];
        const decAmountToSpend = decimalUtility.new(amountToSpend);
        if (decimalUtility.lt(decAmountToSpend, 0)) return true;
        if (resource && resource.isUnlocked) {
            return decimalUtility.gte(resource.amount, decAmountToSpend);
        }
        return false;
    },

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
                    resource.amount = decimalUtility.new(0);
                }
                return true;
            }
            return false;
        }
        loggingSystem.warn("CoreResourceManager", `spendAmount: Resource '${resourceId}' not found or not unlocked.`);
        return false;
    },

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

    getProductionFromSource(resourceId, sourceKey) {
        const resource = resources[resourceId];
        if (resource && resource.productionSources && Object.prototype.hasOwnProperty.call(resource.productionSources, sourceKey)) {
            return decimalUtility.new(resource.productionSources[sourceKey]);
        }
        return decimalUtility.new(0);
    },

    _recalculateTotalProductionRate(resourceId) {
        const resource = resources[resourceId];
        if (!resource) return;

        let totalRate = decimalUtility.new(0);
        for (const sourceKey in resource.productionSources) {
            totalRate = decimalUtility.add(totalRate, resource.productionSources[sourceKey]);
        }
        resource.totalProductionRate = totalRate;
    },

    getTotalProductionRate(resourceId) {
        const resource = resources[resourceId];
        if (resource && resource.isUnlocked) {
            return decimalUtility.new(resource.totalProductionRate);
        }
        return decimalUtility.new(0);
    },

    updateResourceProduction(deltaTimeSeconds) {
        const decDeltaTime = decimalUtility.new(deltaTimeSeconds);
        for (const resourceId in resources) {
            const resource = resources[resourceId];
            if (resource.isUnlocked && resource.hasProductionRate && decimalUtility.gt(resource.totalProductionRate, 0)) {
                const amountGenerated = decimalUtility.multiply(resource.totalProductionRate, decDeltaTime);
                resource.amount = decimalUtility.add(resource.amount, amountGenerated);
            }
        }
    },

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

    setResourceVisibility(resourceId, show) {
        const resource = resources[resourceId];
        if (resource) {
            resource.showInUI = !!show;
        }
    },

    getAllResources() {
        const resourcesCopy = {};
        for (const resId in resources) {
            const original = resources[resId];
            resourcesCopy[resId] = {
                ...original,
                amount: decimalUtility.new(original.amount),
                totalProductionRate: decimalUtility.new(original.totalProductionRate),
                productionSources: { ...original.productionSources },
            };
            for (const srcKey in resourcesCopy[resId].productionSources) {
                resourcesCopy[resId].productionSources[srcKey] = decimalUtility.new(original.productionSources[srcKey]);
            }
        }
        return resourcesCopy;
    },

    resetState() {
        loggingSystem.info("CoreResourceManager", "Resetting all resource states...");
        const currentResourceIds = Object.keys(resources);
        for (const resourceId of currentResourceIds) {
            const staticDef = staticDataAggregator.getData(`core_resource_definitions.${resourceId}`) || 
                              staticDataAggregator.getDataByMatch(def => def.id === resourceId); // Fallback for module-defined

            if (resources[resourceId]) { // Ensure it still exists if reset is complex
                resources[resourceId].amount = decimalUtility.new(staticDef ? staticDef.initialAmount : "0");
                resources[resourceId].productionSources = {};
                resources[resourceId].totalProductionRate = decimalUtility.new(0);
                 // Reset unlock status based on its original definition
                resources[resourceId].isUnlocked = staticDef ? (staticDef.isUnlocked || false) : false;
            }
        }
        loggingSystem.info("CoreResourceManager", "All resource states reset.");
    },

    getSaveData() {
        const saveData = {};
        for (const resourceId in resources) {
            const res = resources[resourceId];
            saveData[resourceId] = {
                id: res.id,
                name: res.name,
                amount: res.amount.toString(),
                isUnlocked: res.isUnlocked,
                showInUI: res.showInUI,
                hasProductionRate: res.hasProductionRate,
                productionSources: {},
            };
            for (const srcKey in res.productionSources) {
                saveData[resourceId].productionSources[srcKey] = res.productionSources[srcKey].toString();
            }
        }
        return saveData;
    },

    loadSaveData(saveData) {
        if (!saveData) {
            loggingSystem.warn("CoreResourceManager", "loadSaveData: No save data provided.");
            this.resetState();
            return;
        }

        for (const resourceId in saveData) {
            const savedRes = saveData[resourceId];
            if (!this.isResourceDefined(resourceId)) {
                loggingSystem.warn("CoreResourceManager", `Loading undefined resource '${resourceId}' from save. Defining now.`);
                this.defineResource(
                    resourceId,
                    savedRes.name || resourceId,
                    savedRes.amount || "0",
                    savedRes.showInUI !== undefined ? savedRes.showInUI : true,
                    savedRes.isUnlocked !== undefined ? savedRes.isUnlocked : false,
                    savedRes.hasProductionRate !== undefined ? savedRes.hasProductionRate : true
                );
            }
            
            const liveResource = resources[resourceId];
            if (liveResource) {
                liveResource.amount = decimalUtility.new(savedRes.amount);
                liveResource.isUnlocked = savedRes.isUnlocked !== undefined ? savedRes.isUnlocked : liveResource.isUnlocked;
                liveResource.showInUI = savedRes.showInUI !== undefined ? savedRes.showInUI : liveResource.showInUI;
                liveResource.hasProductionRate = savedRes.hasProductionRate !== undefined ? savedRes.hasProductionRate : liveResource.hasProductionRate;
                
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

// Removed self-initialization: coreResourceManager.initialize();
// Initialization will be handled by main.js

export { coreResourceManager };
