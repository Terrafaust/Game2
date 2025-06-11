// js/core/coreResourceManager.js (v3.0 - Complete & Refactored)
// Now includes a simple setter for total production rate, used by productionManager.
// ProductionSources are no longer stored here as productionManager is the source of truth for rates.

import { loggingSystem } from './loggingSystem.js';
import { decimalUtility } from './decimalUtility.js';

let resources = {};

const resourceDisplayOrder = [
    'studyPoints',
    'studySkillPoints',
    'prestigeCount',
    'knowledge',
    'prestigeSkillPoints',
    'prestigePoints',
    'images'
];

const coreResourceManager = {
    initialize() {
        resources = {}; 
        loggingSystem.info("CoreResourceManager", "Resource Manager initialized (v3.0).");
    },

    defineResource(resourceId, name, initialAmount = "0", showInUI = true, isUnlocked = true, hasProductionRate = true, resetsOnPrestige = true) {
        if (typeof resourceId !== 'string' || resourceId.trim() === '') {
            loggingSystem.warn("CoreResourceManager_Define", "resourceId must be a non-empty string.");
            return;
        }
        if (resources[resourceId]) {
             // If resource exists, update properties but preserve amount unless it's a reset.
            resources[resourceId].name = name || resources[resourceId].name;
            resources[resourceId].isUnlocked = isUnlocked;
            resources[resourceId].showInUI = showInUI;
            resources[resourceId].hasProductionRate = hasProductionRate;
            resources[resourceId].resetsOnPrestige = resetsOnPrestige;
        } else {
            // If it doesn't exist, create it.
            resources[resourceId] = {
                id: resourceId,
                name: name || "Unnamed Resource",
                amount: decimalUtility.new(initialAmount),
                totalProductionRate: decimalUtility.new(0),
                isUnlocked: isUnlocked,
                showInUI: showInUI,
                hasProductionRate: hasProductionRate,
                resetsOnPrestige: resetsOnPrestige,
                totalEarned: decimalUtility.new(0) // Tracked for stats
            };
            loggingSystem.info("CoreResourceManager_Define", `Resource '${name}' (${resourceId}) newly defined.`);
        }
    },
    
    getTotalEarned(resourceId) {
        const resource = resources[resourceId];
        return resource ? resource.totalEarned : decimalUtility.ZERO;
    },
    
    addAmount(resourceId, amountToAdd) {
        const resource = resources[resourceId];
        if (!resource || !resource.isUnlocked) {
            loggingSystem.warn("CoreResourceManager_AddAmount", `Attempted to add to non-existent or locked resource: '${resourceId}'.`);
            return false;
        }
        
        const decAmountToAdd = decimalUtility.new(amountToAdd);
        if (decimalUtility.lt(decAmountToAdd, 0)) {
            loggingSystem.warn("CoreResourceManager_AddAmount", `Attempted to add negative amount to resource: '${resourceId}'.`);
            return false;
        }
        
        resource.amount = decimalUtility.add(resource.amount, decAmountToAdd);
        resource.totalEarned = decimalUtility.add(resource.totalEarned, decAmountToAdd);
        return true;
    },

    spendAmount(resourceId, amountToSpend) {
        const resource = resources[resourceId];
        if (!resource || !resource.isUnlocked) return false;

        const decAmountToSpend = decimalUtility.new(amountToSpend);
        if (this.canAfford(resourceId, decAmountToSpend)) {
            resource.amount = decimalUtility.subtract(resource.amount, decAmountToSpend);
            return true;
        }
        return false;
    },

    canAfford(resourceId, amountToSpend) {
        const resource = resources[resourceId];
        if (!resource || !resource.isUnlocked) return false;
        return decimalUtility.gte(resource.amount, amountToSpend);
    },

    getAmount(resourceId) {
        const resource = resources[resourceId];
        return (resource && resource.isUnlocked) ? decimalUtility.new(resource.amount) : decimalUtility.ZERO;
    },

    // FIXED: Added the missing getResource function.
    // It returns a copy of the resource's state object.
    getResource(resourceId) {
        const resource = resources[resourceId];
        if (!resource) return null;

        // Return a copy to prevent direct mutation from outside the manager
        const resourceCopy = { ...resource };
        resourceCopy.amount = decimalUtility.new(resource.amount);
        resourceCopy.totalProductionRate = decimalUtility.new(resource.totalProductionRate);
        resourceCopy.totalEarned = decimalUtility.new(resource.totalEarned);
        return resourceCopy;
    },

    setAmount(resourceId, newAmount) {
        const resource = resources[resourceId];
        if(resource) {
            resource.amount = decimalUtility.new(newAmount);
        }
    },
    
    unlockResource(resourceId, unlockStatus = true) {
        const resource = resources[resourceId];
        if(resource) resource.isUnlocked = unlockStatus;
    },

    setResourceVisibility(resourceId, show) {
        const resource = resources[resourceId];
        if(resource) resource.showInUI = !!show;
    },

    setTotalProductionRate(resourceId, newRate) {
        const resource = resources[resourceId];
        if (resource) {
            resource.totalProductionRate = decimalUtility.new(newRate);
        }
    },

    getTotalProductionRate(resourceId) {
        const resource = resources[resourceId];
        return (resource && resource.isUnlocked) ? decimalUtility.new(resource.totalProductionRate) : decimalUtility.ZERO;
    },

    updateResourceProduction(deltaTimeSeconds) {
        const decDeltaTime = decimalUtility.new(deltaTimeSeconds);
        for (const resourceId in resources) {
            const resource = resources[resourceId];
            if (resource.isUnlocked && resource.hasProductionRate && decimalUtility.gt(resource.totalProductionRate, 0)) {
                const amountGenerated = decimalUtility.multiply(resource.totalProductionRate, decDeltaTime);
                this.addAmount(resourceId, amountGenerated);
            }
        }
    },
    
    performPrestigeReset() {
        loggingSystem.info('ResourceManager', 'Performing prestige reset on resources...');
        for (const resId in resources) {
            if (resources[resId].resetsOnPrestige === true) {
                resources[resId].amount = decimalUtility.ZERO;
                resources[resId].totalProductionRate = decimalUtility.ZERO;
                loggingSystem.debug('ResourceManager', `Reset resource: ${resId}`);
            }
        }
    },

    getSaveData() {
        const saveData = {};
        for (const resourceId in resources) {
            const res = resources[resourceId];
            saveData[resourceId] = {
                amount: res.amount.toString(),
                isUnlocked: res.isUnlocked,
                showInUI: res.showInUI,
                totalEarned: res.totalEarned.toString(),
            };
        }
        return saveData;
    },

    loadSaveData(saveData) {
        if (!saveData) return;
        for (const resourceId in saveData) {
            const savedRes = saveData[resourceId];
            if (resources[resourceId]) {
                resources[resourceId].amount = decimalUtility.new(savedRes.amount || '0');
                resources[resourceId].isUnlocked = savedRes.isUnlocked;
                resources[resourceId].showInUI = savedRes.showInUI;
                resources[resourceId].totalEarned = decimalUtility.new(savedRes.totalEarned || savedRes.amount || '0');
            }
        }
    },
    
    getAllResources() {
        const resourcesCopy = {};
        const returnedIds = new Set();
        const prestigePointsVisible = (resources['prestigePoints'] && resources['prestigePoints'].showInUI);
    
        const copyResource = (resId) => {
            const original = resources[resId];
            if (original) {
                const newCopy = JSON.parse(JSON.stringify(original)); // Deep copy
                newCopy.amount = decimalUtility.new(original.amount);
                newCopy.totalProductionRate = decimalUtility.new(original.totalProductionRate);
                if (resId === 'prestigeCount') {
                    newCopy.showInUI = prestigePointsVisible;
                }
                resourcesCopy[resId] = newCopy;
                returnedIds.add(resId);
            }
        };
    
        for (const resId of resourceDisplayOrder) {
            if (resources[resId]) copyResource(resId);
        }
    
        for (const resId in resources) {
            if (!returnedIds.has(resId)) copyResource(resId);
        }
    
        return resourcesCopy;
    },

    resetState() {
        // This function is now simpler. It just clears the resources.
        // The manifests of each module are responsible for re-defining them on reset.
        resources = {};
        loggingSystem.info("CoreResourceManager", "All resources cleared for hard reset.");
    }
};

export { coreResourceManager };
