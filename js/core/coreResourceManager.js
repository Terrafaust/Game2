// js/core/coreResourceManager.js (v2.0 - Total Earned Tracking)

/**
 * @file coreResourceManager.js
 * @description Manages all game resources (e.g., Study Points, Knowledge),
 * their current amounts, and their generation rates per second.
 * v2.0: Added totalEarned tracking for detailed statistics.
 * v1.4: Added resetsOnPrestige flag and performPrestigeReset function for Ascension System.
 */

import { loggingSystem } from './loggingSystem.js';
import { decimalUtility } from './decimalUtility.js';
import { staticDataAggregator } from './staticDataAggregator.js';

let resources = {};

const coreResourceManager = {
    initialize() {
        resources = {}; 
        loggingSystem.info("CoreResourceManager", "Resource Manager initialized (v2.0).");
    },

    defineResource(resourceId, name, initialAmount = decimalUtility.new(0), showInUI = true, isUnlocked = true, hasProductionRate = true, resetsOnPrestige = true) {
        if (typeof resourceId !== 'string' || resourceId.trim() === '') {
            loggingSystem.warn("CoreResourceManager_Define", "resourceId must be a non-empty string.");
            return;
        }
        const newAmountDec = decimalUtility.isDecimal(initialAmount) ? initialAmount : decimalUtility.new(initialAmount);

        if (resources[resourceId] && resources[resourceId].isInitialized) {
            resources[resourceId].name = name || resources[resourceId].name;
            resources[resourceId].isUnlocked = isUnlocked;
            resources[resourceId].showInUI = showInUI;    
            resources[resourceId].hasProductionRate = hasProductionRate;
            resources[resourceId].resetsOnPrestige = resetsOnPrestige;
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
                resetsOnPrestige: resetsOnPrestige,
                isInitialized: true,
                // --- FEATURE: Add totalEarned property ---
                totalEarned: decimalUtility.new(0)
            };
            loggingSystem.info("CoreResourceManager_Define", `Resource '${name}' (${resourceId}) newly defined.`);
        }
    },
    
    // --- FEATURE: New function to get total earned resources for stats ---
    getTotalEarned(resourceId) {
        const resource = resources[resourceId];
        if (resource) {
            return resource.totalEarned;
        }
        return decimalUtility.new(0);
    },
    

    addAmount(resourceId, amountToAdd) {
        const resource = resources[resourceId];
        const decAmountToAdd = decimalUtility.new(amountToAdd);

        if (!resource || !resource.isInitialized) {
            loggingSystem.error("CoreResourceManager_AddAmount", `CRITICAL_ERROR: Resource '${resourceId}' is not defined. Cannot add amount.`);
            return false;
        }
        
        if (!resource.isUnlocked) {
            return false; 
        }

        if (decimalUtility.lt(decAmountToAdd, 0)) {
            return false;
        }
        
        resource.amount = decimalUtility.add(resource.amount, decAmountToAdd);
        // --- FEATURE: Increment total earned whenever amount is added ---
        resource.totalEarned = decimalUtility.add(resource.totalEarned, decAmountToAdd);
        return true;
    },

    updateResourceProduction(deltaTimeSeconds) {
        const decDeltaTime = decimalUtility.new(deltaTimeSeconds);
        for (const resourceId in resources) {
            const resource = resources[resourceId];
            if (resource.isUnlocked && resource.hasProductionRate && decimalUtility.gt(resource.totalProductionRate, 0)) {
                const amountGenerated = decimalUtility.multiply(resource.totalProductionRate, decDeltaTime);
                // Use addAmount to ensure totalEarned is also updated
                this.addAmount(resourceId, amountGenerated);
            }
        }
    },
    
    performPrestigeReset() {
        loggingSystem.info('ResourceManager', 'Performing prestige reset on resources...');
        for (const resId in resources) {
            if (resources[resId].resetsOnPrestige === true) {
                resources[resId].amount = decimalUtility.new(0);
                resources[resId].productionSources = {};
                resources[resId].totalProductionRate = decimalUtility.new(0);
                loggingSystem.debug('ResourceManager', `Reset resource: ${resId}`);
            }
            // Note: totalEarned is intentionally NOT reset
        }
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
                    resetsOnPrestige: res.resetsOnPrestige,
                    // --- FEATURE: Save totalEarned ---
                    totalEarned: res.totalEarned.toString(),
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
            return;
        }
        for (const resourceId in saveData) {
            const savedRes = saveData[resourceId];
            this.defineResource(
                resourceId,
                savedRes.name || resourceId,
                decimalUtility.new(savedRes.amount),
                savedRes.showInUI,
                savedRes.isUnlocked,
                savedRes.hasProductionRate !== undefined ? savedRes.hasProductionRate : true,
                savedRes.resetsOnPrestige !== undefined ? savedRes.resetsOnPrestige : true
            );
            
            const resource = resources[resourceId];
            if (resource) {
                // --- FEATURE: Load totalEarned from save data ---
                resource.totalEarned = decimalUtility.new(savedRes.totalEarned || savedRes.amount || '0');
                
                if (savedRes.productionSources) {
                     resource.productionSources = {};
                     for (const srcKey in savedRes.productionSources) {
                        resource.productionSources[srcKey] = decimalUtility.new(savedRes.productionSources[srcKey]);
                    }
                    this._recalculateTotalProductionRate(resourceId);
                }
            }
        }
    },

    // --- UNCHANGED ORIGINAL FUNCTIONS ---
    isResourceDefined(resourceId) { return resources[resourceId] && resources[resourceId].isInitialized; },
    getResource(resourceId) {
        const resource = resources[resourceId];
        if (resource && resource.isInitialized) {
            const resourceCopy = { ...resource, amount: decimalUtility.new(resource.amount), totalProductionRate: decimalUtility.new(resource.totalProductionRate), productionSources: { ...resource.productionSources }, };
            for (const srcKey in resourceCopy.productionSources) { resourceCopy.productionSources[srcKey] = decimalUtility.new(resource.productionSources[srcKey]); }
            return resourceCopy;
        }
        return null;
    },
    getAmount(resourceId) {
        const resource = resources[resourceId];
        if (resource && resource.isUnlocked) { return decimalUtility.new(resource.amount); }
        return decimalUtility.new(0);
    },
    setAmount(resourceId, newAmount) {
        const resource = resources[resourceId];
        if (resource && resource.isInitialized) { 
            const amountToSet = decimalUtility.new(newAmount);
            resource.amount = decimalUtility.lt(amountToSet, 0) ? decimalUtility.new(0) : amountToSet;
            return true;
        }
        return false;
    },
    canAfford(resourceId, amountToSpend) {
        const resource = resources[resourceId];
        const decAmountToSpend = decimalUtility.new(amountToSpend);
        if (decimalUtility.lt(decAmountToSpend, 0)) return true; 
        if (resource && resource.isUnlocked) { return decimalUtility.gte(resource.amount, decAmountToSpend); }
        return false;
    },
    spendAmount(resourceId, amountToSpend, allowNegative = false) {
        const resource = resources[resourceId];
        const decAmountToSpend = decimalUtility.new(amountToSpend);
        if (!resource || !resource.isInitialized || !resource.isUnlocked || decimalUtility.lt(decAmountToSpend, 0)) {
            return false;
        }
        if (decimalUtility.gte(resource.amount, decAmountToSpend) || allowNegative) {
            resource.amount = decimalUtility.subtract(resource.amount, decAmountToSpend);
            if (!allowNegative && decimalUtility.lt(resource.amount, 0)) {
                resource.amount = decimalUtility.new(0);
            }
            return true;
        }
        return false;
    },
    setProductionPerSecond(resourceId, sourceKey, productionPerSecond) {
        const resource = resources[resourceId];
        if (!resource || typeof sourceKey !== 'string' || sourceKey.trim() === '') { return; }
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
        if (resource && resource.isUnlocked) { return decimalUtility.new(resource.totalProductionRate); }
        return decimalUtility.new(0);
    },
    unlockResource(resourceId, unlockStatus = true) { 
        const resource = resources[resourceId];
        if (resource) { resource.isUnlocked = unlockStatus; }
    },
    setResourceVisibility(resourceId, show) {
        const resource = resources[resourceId];
        if (resource) { resource.showInUI = !!show; }
    },
    getAllResources() {
        const resourcesCopy = {};
        for (const resId in resources) {
            const original = resources[resId];
            if (original.isInitialized) { 
                resourcesCopy[resId] = { ...original, amount: decimalUtility.new(original.amount), totalProductionRate: decimalUtility.new(original.totalProductionRate), productionSources: { ...original.productionSources }, };
                for (const srcKey in resourcesCopy[resId].productionSources) { resourcesCopy[resId].productionSources[srcKey] = decimalUtility.new(original.productionSources[srcKey]); }
            }
        }
        return resourcesCopy;
    },
    resetState() {
        const coreResourceDefinitions = staticDataAggregator.getData('core_resource_definitions') || {};
        const newResourcesState = {};
        for (const resId in coreResourceDefinitions) {
            const resDef = coreResourceDefinitions[resId];
            newResourcesState[resId] = { id: resDef.id, name: resDef.name, amount: decimalUtility.new(resDef.initialAmount), productionSources: {}, totalProductionRate: decimalUtility.new(0), isUnlocked: resDef.isUnlocked, showInUI: resDef.showInUI, hasProductionRate: resDef.hasProductionRate, resetsOnPrestige: true, isInitialized: true, };
        }
        resources = newResourcesState;
    }
};

export { coreResourceManager };
