// js/core/coreResourceManager.js (v1.4 - Prestige Ready)

/**
 * @file coreResourceManager.js
 * @description Manages all game resources (e.g., Study Points, Knowledge),
 * their current amounts, and their generation rates per second.
 * Uses decimalUtility.js for all numerical values.
 * v1.4: Added resetsOnPrestige flag and performPrestigeReset function for Ascension System.
 * v1.3: Added more specific logging for isUnlocked state during definition and access.
 * v1.2: Enhanced logging for resource redefinition to track 'isUnlocked' status changes.
 */

import { loggingSystem } from './loggingSystem.js';
import { decimalUtility } from './decimalUtility.js';
import { staticDataAggregator } from './staticDataAggregator.js';

let resources = {};

const coreResourceManager = {
    initialize() {
        resources = {}; 
        loggingSystem.info("CoreResourceManager", "Resource Manager initialized (v1.4).");
    },

    // Action 1: Modify defineResource to include resetsOnPrestige
    defineResource(resourceId, name, initialAmount = decimalUtility.new(0), showInUI = true, isUnlocked = true, hasProductionRate = true, resetsOnPrestige = true) {
        if (typeof resourceId !== 'string' || resourceId.trim() === '') {
            loggingSystem.warn("CoreResourceManager_Define", "resourceId must be a non-empty string.");
            return;
        }
        const newAmountDec = decimalUtility.isDecimal(initialAmount) ? initialAmount : decimalUtility.new(initialAmount);

        loggingSystem.debug("CoreResourceManager_Define", `Attempting to define/redefine '${resourceId}'. Incoming isUnlocked: ${isUnlocked}, showInUI: ${showInUI}`);

        if (resources[resourceId] && resources[resourceId].isInitialized) {
            loggingSystem.debug("CoreResourceManager_Define", `Redefining resource '${resourceId}'. Current isUnlocked: ${resources[resourceId].isUnlocked}. Incoming isUnlocked: ${isUnlocked}.`);
            resources[resourceId].name = name || resources[resourceId].name;
            resources[resourceId].isUnlocked = isUnlocked;
            resources[resourceId].showInUI = showInUI;    
            resources[resourceId].hasProductionRate = hasProductionRate;
            resources[resourceId].resetsOnPrestige = resetsOnPrestige; // Update property
            loggingSystem.info("CoreResourceManager_Define", `Resource '${name}' (${resourceId}) redefined. New isUnlocked: ${resources[resourceId].isUnlocked}, ShowInUI: ${resources[resourceId].showInUI}. Amount preserved: ${resources[resourceId].amount.toString()}`);
        } else {
            resources[resourceId] = {
                id: resourceId,
                name: name || "Unnamed Resource",
                amount: newAmountDec,
                productionSources: {},
                totalProductionRate: decimalUtility.new(0),
                isUnlocked: isUnlocked,
                showInUI: showInUI,
                hasProductionRate: hasProductionRate,
                resetsOnPrestige: resetsOnPrestige, // Store the property
                isInitialized: true,
            };
            loggingSystem.info("CoreResourceManager_Define", `Resource '${name}' (${resourceId}) newly defined. Amount: ${newAmountDec.toString()}, isUnlocked: ${resources[resourceId].isUnlocked}, ShowInUI: ${resources[resourceId].showInUI}`);
        }
    },

    isResourceDefined(resourceId) {
        return resources[resourceId] && resources[resourceId].isInitialized;
    },

    getResource(resourceId) {
        const resource = resources[resourceId];
        if (resource && resource.isInitialized) {
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
        loggingSystem.debug("CoreResourceManager_Get", `Resource '${resourceId}' not found or not initialized.`);
        return null;
    },

    getAmount(resourceId) {
        const resource = resources[resourceId];
        if (resource && resource.isUnlocked) {
            return decimalUtility.new(resource.amount);
        }
        if (!resource) {
            loggingSystem.warn("CoreResourceManager_GetAmount", `Resource '${resourceId}' not defined when getting amount.`);
        } else if (!resource.isUnlocked) {
            loggingSystem.warn("CoreResourceManager_GetAmount", `Resource '${resourceId}' is defined but LOCKED when getting amount. Current amount (hidden): ${resource.amount.toString()}. Returning 0.`);
        }
        return decimalUtility.new(0);
    },

    setAmount(resourceId, newAmount) {
        const resource = resources[resourceId];
        if (resource && resource.isInitialized) { 
            const amountToSet = decimalUtility.new(newAmount);
            resource.amount = decimalUtility.lt(amountToSet, 0) ? decimalUtility.new(0) : amountToSet;
            loggingSystem.debug("CoreResourceManager_SetAmount", `Set amount for '${resourceId}' to ${resource.amount.toString()}. isUnlocked: ${resource.isUnlocked}`);
            return true;
        }
        loggingSystem.warn("CoreResourceManager_SetAmount", `Resource '${resourceId}' not found for setAmount.`);
        return false;
    },

    addAmount(resourceId, amountToAdd) {
        const resource = resources[resourceId];
        const decAmountToAdd = decimalUtility.new(amountToAdd);

        if (!resource || !resource.isInitialized) {
            loggingSystem.error("CoreResourceManager_AddAmount", `CRITICAL_ERROR: Resource '${resourceId}' is not defined AT ALL. Cannot add amount. Please check module manifests and load order.`);
            return false;
        }
        
        loggingSystem.debug("CoreResourceManager_AddAmount", `Attempting to add to '${resourceId}'. Current state: isUnlocked=${resource.isUnlocked}, showInUI=${resource.showInUI}, amount=${resource.amount.toString()}`);

        if (!resource.isUnlocked) {
            loggingSystem.warn("CoreResourceManager_AddAmount", `Resource '${resourceId}' is defined but LOCKED. Amount ${decAmountToAdd.toString()} not added. Current amount: ${resource.amount.toString()}`);
            return false; 
        }

        if (decimalUtility.lt(decAmountToAdd, 0)) {
            loggingSystem.warn("CoreResourceManager_AddAmount", `Cannot add negative value to '${resourceId}'. Use spendAmount instead.`);
            return false;
        }
        
        resource.amount = decimalUtility.add(resource.amount, decAmountToAdd);
        loggingSystem.info("CoreResourceManager_AddAmount", `Successfully added ${decAmountToAdd.toString()} to '${resourceId}'. New amount: ${resource.amount.toString()}`);
        return true;
    },

    canAfford(resourceId, amountToSpend) {
        const resource = resources[resourceId];
        const decAmountToSpend = decimalUtility.new(amountToSpend);
        if (decimalUtility.lt(decAmountToSpend, 0)) return true; 
        if (resource && resource.isUnlocked) {
            return decimalUtility.gte(resource.amount, decAmountToSpend);
        }
        if (!resource) loggingSystem.warn("CoreResourceManager_CanAfford", `Resource '${resourceId}' not defined for canAfford check.`);
        else if (!resource.isUnlocked) loggingSystem.warn("CoreResourceManager_CanAfford", `Resource '${resourceId}' is locked for canAfford check. Amount (hidden): ${resource.amount.toString()}`);
        return false;
    },

    spendAmount(resourceId, amountToSpend, allowNegative = false) {
        const resource = resources[resourceId];
        const decAmountToSpend = decimalUtility.new(amountToSpend);

        if (!resource || !resource.isInitialized) {
            loggingSystem.error("CoreResourceManager_SpendAmount", `CRITICAL_ERROR: Resource '${resourceId}' is not defined AT ALL. Cannot spend.`);
            return false;
        }
        if (!resource.isUnlocked) {
            loggingSystem.warn("CoreResourceManager_SpendAmount", `Resource '${resourceId}' is defined but LOCKED. Amount not spent.`);
            return false;
        }

        if (decimalUtility.lt(decAmountToSpend, 0)) {
            loggingSystem.warn("CoreResourceManager_SpendAmount", `Cannot spend negative value for '${resourceId}'. Use addAmount instead.`);
            return false;
        }

        if (decimalUtility.gte(resource.amount, decAmountToSpend) || allowNegative) {
            resource.amount = decimalUtility.subtract(resource.amount, decAmountToSpend);
            if (!allowNegative && decimalUtility.lt(resource.amount, 0)) {
                resource.amount = decimalUtility.new(0);
            }
            loggingSystem.info("CoreResourceManager_SpendAmount", `Successfully spent ${decAmountToSpend.toString()} from '${resourceId}'. New amount: ${resource.amount.toString()}`);
            return true;
        }
        loggingSystem.warn("CoreResourceManager_SpendAmount", `Cannot afford to spend ${decAmountToSpend.toString()} from '${resourceId}'. Have: ${resource.amount.toString()}`);
        return false;
    },

    setProductionPerSecond(resourceId, sourceKey, productionPerSecond) {
        const resource = resources[resourceId];
        if (!resource) { 
            loggingSystem.warn("CoreResourceManager_SetProd", `Resource '${resourceId}' not defined. Cannot set production.`);
            return;
        }
        if (typeof sourceKey !== 'string' || sourceKey.trim() === '') {
            loggingSystem.warn("CoreResourceManager_SetProd", `sourceKey for '${resourceId}' must be a non-empty string.`);
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

    unlockResource(resourceId, unlockStatus = true) { 
        const resource = resources[resourceId];
        if (resource) {
            if (resource.isUnlocked !== unlockStatus) {
                resource.isUnlocked = unlockStatus;
                loggingSystem.info("CoreResourceManager_Unlock", `Resource '${resource.name}' (${resourceId}) explicitely ${unlockStatus ? 'UNLOCKED' : 'LOCKED'}.`);
            }
        } else {
            loggingSystem.warn("CoreResourceManager_Unlock", `Cannot ${unlockStatus ? 'unlock' : 'lock'} resource '${resourceId}', not defined.`);
        }
    },

    setResourceVisibility(resourceId, show) {
        const resource = resources[resourceId];
        if (resource) {
            if (resource.showInUI !== !!show) {
                resource.showInUI = !!show;
                loggingSystem.info("CoreResourceManager_SetVisibility", `Resource '${resource.name}' (${resourceId}) visibility set to ${resource.showInUI}.`);
            }
        } else {
             loggingSystem.warn("CoreResourceManager_SetVisibility", `Cannot set visibility for resource '${resourceId}', not defined.`);
        }
    },

    getAllResources() {
        const resourcesCopy = {};
        for (const resId in resources) {
            const original = resources[resId];
            if (original.isInitialized) { 
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
        }
        return resourcesCopy;
    },

    resetState() {
        loggingSystem.info("CoreResourceManager_Reset", "Resetting all resource states...");
        const coreResourceDefinitions = staticDataAggregator.getData('core_resource_definitions') || {};
        
        const newResourcesState = {};

        for (const resId in coreResourceDefinitions) {
            const resDef = coreResourceDefinitions[resId];
            newResourcesState[resId] = {
                id: resDef.id,
                name: resDef.name,
                amount: decimalUtility.new(resDef.initialAmount),
                productionSources: {},
                totalProductionRate: decimalUtility.new(0),
                isUnlocked: resDef.isUnlocked,
                showInUI: resDef.showInUI,
                hasProductionRate: resDef.hasProductionRate,
                resetsOnPrestige: true, // Core resources reset by default
                isInitialized: true,
            };
            loggingSystem.debug("CoreResourceManager_Reset", `Reset core resource: ${resId} to initial state.`);
        }
        resources = newResourcesState;
        loggingSystem.info("CoreResourceManager_Reset", "Core resource states reset. Module resources will be redefined by their manifests.");
    },

    getSaveData() {
        const saveData = {};
        for (const resourceId in resources) {
            const res = resources[resourceId];
            if (res.isInitialized) {
                saveData[resourceId] = {
                    id: res.id,
                    name: res.name,
                    amount: res.amount.toString(),
                    isUnlocked: res.isUnlocked,
                    showInUI: res.showInUI,
                    hasProductionRate: res.hasProductionRate,
                    resetsOnPrestige: res.resetsOnPrestige, // Save the flag
                    productionSources: {},
                };
                for (const srcKey in res.productionSources) {
                    saveData[resourceId].productionSources[srcKey] = res.productionSources[srcKey].toString();
                }
            }
        }
        return saveData;
    },

    loadSaveData(saveData) {
        if (!saveData) {
            loggingSystem.warn("CoreResourceManager_LoadSave", "No save data provided.");
            return;
        }
        loggingSystem.info("CoreResourceManager_LoadSave", "Loading resource data from save.", Object.keys(saveData));

        for (const resourceId in saveData) {
            const savedRes = saveData[resourceId];
            this.defineResource(
                resourceId,
                savedRes.name || resourceId,
                decimalUtility.new(savedRes.amount),
                savedRes.showInUI,
                savedRes.isUnlocked,
                savedRes.hasProductionRate !== undefined ? savedRes.hasProductionRate : true,
                savedRes.resetsOnPrestige !== undefined ? savedRes.resetsOnPrestige : true // Load the flag
            );
            
            if (resources[resourceId] && savedRes.productionSources) {
                 resources[resourceId].productionSources = {};
                 for (const srcKey in savedRes.productionSources) {
                    resources[resourceId].productionSources[srcKey] = decimalUtility.new(savedRes.productionSources[srcKey]);
                }
                this._recalculateTotalProductionRate(resourceId);
            }
            loggingSystem.debug("CoreResourceManager_LoadSave", `Loaded resource '${resourceId}' from save. isUnlocked: ${resources[resourceId]?.isUnlocked}, showInUI: ${resources[resourceId]?.showInUI}`);
        }
        loggingSystem.info("CoreResourceManager_LoadSave", "Resource data loading complete.");
    },

    // Action 2: Add the new performPrestigeReset function
    performPrestigeReset() {
        loggingSystem.info('ResourceManager', 'Performing prestige reset on resources...');
        for (const resId in resources) {
            if (resources[resId].resetsOnPrestige === true) {
                resources[resId].amount = decimalUtility.new(0);
                loggingSystem.debug('ResourceManager', `Reset resource: ${resId}`);
            }
        }
    }
};

export { coreResourceManager };
