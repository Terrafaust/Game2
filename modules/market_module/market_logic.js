// modules/market_module/market_logic.js (v4.1 - Adapt to New Data Structure)

/**
 * @file market_logic.js
 * @description Business logic for the Market module.
 * v4.1: Adapted logic to handle new categorized data structure from market_data.js.
 * v4.0: Corrected cost reduction logic to apply to base cost.
 * v3.0: Implemented cost reduction multipliers from achievements.
 */

import { staticModuleData } from './market_data.js';
import { moduleState, getInitialState } from './market_state.js';

let coreSystemsRef = null;

// --- MODIFICATION: Helper to get item definition from new structure ---
function getItemDefinition(itemId) {
    const allItems = {
        ...staticModuleData.consumables,
        ...staticModuleData.skillPoints,
    };
    return allItems[itemId];
}

function getUnlockDefinition(unlockId) {
     return staticModuleData.featureUnlocks[unlockId];
}


export const moduleLogic = {
    initialize(coreSystems) {
        coreSystemsRef = coreSystems;
        coreSystemsRef.loggingSystem.info("MarketLogic", "Logic initialized (v4.1).");
    },
    
    calculateMaxBuyable(itemId) {
        const { coreResourceManager, decimalUtility, coreUpgradeManager } = coreSystemsRef;
        const itemDef = getItemDefinition(itemId);
        if (!itemDef) return decimalUtility.ZERO;

        const purchaseCountKey = itemDef.benefitResource;
        const ownedCount = decimalUtility.new(moduleState.purchaseCounts[purchaseCountKey] || "0");
        const costResource = itemDef.costResource;
        
        const availableCurrency = coreResourceManager.getAmount(costResource);
        const baseCost = decimalUtility.new(itemDef.baseCost);
        
        const costReductionMultiplier = coreUpgradeManager.getCostReductionMultiplier('market_items', itemId);
        const effectiveBaseCost = decimalUtility.multiply(baseCost, costReductionMultiplier);
        
        let costGrowthFactor = decimalUtility.new(itemDef.costGrowthFactor);
        const growthReduction = coreUpgradeManager.getAggregatedModifiers('market_items', itemId, 'COST_GROWTH_REDUCTION');
        if(decimalUtility.gt(growthReduction, 1)) {
            const effectiveGrowthMultiplier = decimalUtility.subtract(1, growthReduction);
            costGrowthFactor = decimalUtility.add(1, decimalUtility.multiply(decimalUtility.subtract(costGrowthFactor, 1), effectiveGrowthMultiplier));
        }

        if (decimalUtility.lt(availableCurrency, effectiveBaseCost)) return decimalUtility.ZERO;
        
        const R = costGrowthFactor;
        const R_minus_1 = decimalUtility.subtract(R, 1);
        const C_base_pow_owned = decimalUtility.multiply(effectiveBaseCost, decimalUtility.power(R, ownedCount));
        if (decimalUtility.lte(C_base_pow_owned, 0)) return decimalUtility.new(Infinity);

        const term = decimalUtility.divide(decimalUtility.multiply(availableCurrency, R_minus_1), C_base_pow_owned);
        const LHS = decimalUtility.add(term, 1);
        if (decimalUtility.lte(LHS, 1)) return decimalUtility.ZERO;

        const log_LHS = decimalUtility.ln(LHS);
        const log_R = decimalUtility.ln(R);
        if (decimalUtility.lte(log_R, 0)) return decimalUtility.ZERO;
        
        const max_n = decimalUtility.floor(decimalUtility.divide(log_LHS, log_R));
        return decimalUtility.max(max_n, 0);
    },

    calculateScalableItemCost(itemId, quantity = 1) {
        const { decimalUtility, coreUpgradeManager } = coreSystemsRef;
        const itemDef = getItemDefinition(itemId);
        if (!itemDef) return decimalUtility.new(Infinity);
        
        let n = decimalUtility.new(quantity);
        if (quantity === -1) {
            n = this.calculateMaxBuyable(itemId);
            if (decimalUtility.eq(n, 0)) return decimalUtility.new(Infinity);
        }

        const baseCost = decimalUtility.new(itemDef.baseCost);
        
        const costReductionMultiplier = coreUpgradeManager.getCostReductionMultiplier('market_items', itemId);
        const effectiveBaseCost = decimalUtility.multiply(baseCost, costReductionMultiplier);

        let costGrowthFactor = decimalUtility.new(itemDef.costGrowthFactor);
        const growthReduction = coreUpgradeManager.getAggregatedModifiers('market_items', itemId, 'COST_GROWTH_REDUCTION');
        if(decimalUtility.lt(growthReduction, 1)) {
            const growthPart = decimalUtility.subtract(costGrowthFactor, 1);
            const reducedGrowthPart = decimalUtility.multiply(growthPart, growthReduction);
            costGrowthFactor = decimalUtility.add(1, reducedGrowthPart);
        }
        
        const purchaseCountKey = itemDef.benefitResource;
        const ownedCount = decimalUtility.new(moduleState.purchaseCounts[purchaseCountKey] || "0");
        let totalCost;

        if (decimalUtility.eq(costGrowthFactor, 1)) {
            totalCost = decimalUtility.multiply(effectiveBaseCost, n);
        } else {
            const R_pow_n = decimalUtility.power(costGrowthFactor, n);
            const numerator = decimalUtility.subtract(R_pow_n, 1);
            const denominator = decimalUtility.subtract(costGrowthFactor, 1);
            totalCost = decimalUtility.multiply(effectiveBaseCost, decimalUtility.divide(numerator, denominator));
        }

        const priceIncreaseFromOwned = decimalUtility.power(costGrowthFactor, ownedCount);
        totalCost = decimalUtility.multiply(totalCost, priceIncreaseFromOwned);

        return totalCost;
    },

    purchaseScalableItem(itemId) {
        const { coreResourceManager, decimalUtility, coreGameStateManager, coreUIManager, buyMultiplierManager, moduleLoader } = coreSystemsRef;
        const itemDef = getItemDefinition(itemId);
        if (!itemDef) return false;
        
        let quantity = buyMultiplierManager.getMultiplier();
        if (quantity === -1) {
            quantity = this.calculateMaxBuyable(itemId);
            if (decimalUtility.lte(quantity, 0)) {
                 coreUIManager.showNotification(`Cannot afford any ${itemDef.name.replace('Acquire ', '')}.`, 'warning');
                return false;
            }
        } else {
            quantity = decimalUtility.new(quantity);
        }

        const cost = this.calculateScalableItemCost(itemId, quantity);
        const costResource = itemDef.costResource;

        if (coreResourceManager.canAfford(costResource, cost)) {
            coreResourceManager.spendAmount(costResource, cost);
            
            if (itemDef.benefitResource === 'images') {
                const imagesRes = coreResourceManager.getResource('images');
                if (imagesRes && !imagesRes.isUnlocked) coreResourceManager.unlockResource('images', true);
                if (imagesRes && !imagesRes.showInUI) coreResourceManager.setResourceVisibility('images', true); 
            } else if (itemDef.benefitResource === 'prestigeSkillPoints') {
                const pspRes = coreResourceManager.getResource('prestigeSkillPoints');
                if (pspRes && !pspRes.isUnlocked) coreResourceManager.unlockResource('prestigeSkillPoints', true);
            }
            
            const benefitAmount = decimalUtility.multiply(itemDef.benefitAmountPerPurchase, quantity);
            coreResourceManager.addAmount(itemDef.benefitResource, benefitAmount);
            const purchaseCountKey = itemDef.benefitResource;
            let currentPurchaseCount = decimalUtility.new(moduleState.purchaseCounts[purchaseCountKey] || "0");
            moduleState.purchaseCounts[purchaseCountKey] = decimalUtility.add(currentPurchaseCount, quantity).toString();
            coreGameStateManager.setModuleState('market', { ...moduleState });
            coreUIManager.showNotification(`Acquired ${decimalUtility.format(benefitAmount,0)} ${itemDef.name.replace('Acquire ', '')}${decimalUtility.gt(quantity,1) ? 's' : ''}!`, 'success', 2000);
            
            if (itemDef.benefitResource === 'images') coreUIManager.updateResourceDisplay();
            
            const skillsModule = moduleLoader.getModule('skills');
            if (itemDef.benefitResource === 'studySkillPoints' || itemDef.benefitResource === 'prestigeSkillPoints') {
                 if (skillsModule?.logic?.isSkillsTabUnlocked) skillsModule.logic.isSkillsTabUnlocked(); 
                 else coreUIManager.renderMenu();
            }
            return true;
        } else {
             coreUIManager.showNotification(`Not enough resources.`, 'error');
            return false;
        }
    },
    
    canAffordUnlock(unlockId) { 
        const { coreResourceManager, decimalUtility } = coreSystemsRef;
        const unlockDef = getUnlockDefinition(unlockId);
        if (!unlockDef) return false;
        return coreResourceManager.canAfford(unlockDef.costResource, decimalUtility.new(unlockDef.costAmount));
    },

    isUnlockPurchased(unlockId) { 
        const { coreGameStateManager } = coreSystemsRef;
        const unlockDef = getUnlockDefinition(unlockId);
        if (!unlockDef) return true;
        return coreGameStateManager.getGlobalFlag(unlockDef.flagToSet, false);
    },

    purchaseUnlock(unlockId) { 
        const { coreResourceManager, decimalUtility, coreGameStateManager, coreUIManager } = coreSystemsRef;
        const unlockDef = getUnlockDefinition(unlockId);
        if (!unlockDef || this.isUnlockPurchased(unlockId)) return false;
        
        if (this.canAffordUnlock(unlockId)) { 
            coreResourceManager.spendAmount(unlockDef.costResource, decimalUtility.new(unlockDef.costAmount));
            coreGameStateManager.setGlobalFlag(unlockDef.flagToSet, true);
            // Redundant flag kept for safety, main check should be on the simple flag
            coreGameStateManager.setGlobalFlag(`marketUnlock_${unlockDef.flagToSet}_purchased`, true); 
            coreUIManager.showNotification(`${unlockDef.name.replace('Unlock ','').replace(' Menu','')} Unlocked!`, 'success', 3000);
            coreUIManager.renderMenu();
            return true;
        }
        return false;
    },

    isMarketTabUnlocked() {
        if (!coreSystemsRef) return true; 
        const { coreGameStateManager, coreUIManager, loggingSystem } = coreSystemsRef;
        if (coreGameStateManager.getGlobalFlag('marketTabPermanentlyUnlocked', false)) return true; 
        const conditionMet = coreGameStateManager.getGlobalFlag('marketUnlocked', false); 
        if (conditionMet) {
            coreGameStateManager.setGlobalFlag('marketTabPermanentlyUnlocked', true);
            if(coreUIManager) coreUIManager.renderMenu(); 
            loggingSystem.info("MarketLogic", "Market tab permanently unlocked.");
            return true;
        }
        return false;
    },

    getAutomatorLevel(automatorId) {
        return moduleState.automatorLevels[automatorId] || 0;
    },

    getAutomatorInfo(automatorId) {
        const automatorDef = staticModuleData.marketAutomations[automatorId];
        if (!automatorDef) return null;

        const currentLevel = this.getAutomatorLevel(automatorId);
        const nextLevelInfo = automatorDef.levels[currentLevel];

        return {
            currentLevel: currentLevel,
            maxLevel: automatorDef.levels.length,
            nextLevelInfo: nextLevelInfo || null
        };
    },
    
    purchaseAutomatorUpgrade(automatorId) {
        const { coreResourceManager, coreGameStateManager, decimalUtility, coreUIManager } = coreSystemsRef;
        const automatorInfo = this.getAutomatorInfo(automatorId);

        if (!automatorInfo || !automatorInfo.nextLevelInfo) {
            coreUIManager.showNotification('Already at max level!', 'warning');
            return false;
        }

        const cost = decimalUtility.new(automatorInfo.nextLevelInfo.cost);
        const costResource = staticModuleData.marketAutomations[automatorId].costResource;

        if (coreResourceManager.canAfford(costResource, cost)) {
            coreResourceManager.spendAmount(costResource, cost);
            moduleState.automatorLevels[automatorId]++;
            coreGameStateManager.setModuleState('market', { ...moduleState });
            
            coreUIManager.showNotification(`${staticModuleData.marketAutomations[automatorId].name} upgraded to Level ${moduleState.automatorLevels[automatorId]}!`, 'success');
            return true;
        } else {
            coreUIManager.showNotification(`Not enough ${coreResourceManager.getResource(costResource).name}.`, 'error');
            return false;
        }
    },

    processImageAutomation(deltaTimeSeconds) {
        const { coreResourceManager, coreGameStateManager, decimalUtility } = coreSystemsRef;
        const automatorInfo = this.getAutomatorInfo('imageAutomator');
        
        if (!automatorInfo || automatorInfo.currentLevel === 0) return;

        const currentLevelDef = staticModuleData.marketAutomations.imageAutomator.levels[automatorInfo.currentLevel - 1];
        const rate = decimalUtility.new(currentLevelDef.rate);
        
        const generatedThisTick = decimalUtility.multiply(rate, deltaTimeSeconds);
        const currentProgress = decimalUtility.new(moduleState.automationProgress.imageAutomator || '0');
        const newProgress = decimalUtility.add(currentProgress, generatedThisTick);

        if (decimalUtility.gte(newProgress, 1)) {
            const wholeImagesToBuy = decimalUtility.floor(newProgress);
            
            coreResourceManager.addAmount('images', wholeImagesToBuy);
            
            const currentPurchaseCount = decimalUtility.new(moduleState.purchaseCounts.images || "0");
            moduleState.purchaseCounts.images = decimalUtility.add(currentPurchaseCount, wholeImagesToBuy).toString();

            moduleState.automationProgress.imageAutomator = decimalUtility.subtract(newProgress, wholeImagesToBuy).toString();
            
            coreGameStateManager.setModuleState('market', { ...moduleState });
            
            const imagesRes = coreResourceManager.getResource('images');
            if (imagesRes && !imagesRes.isUnlocked) coreResourceManager.unlockResource('images', true);
            if (imagesRes && !imagesRes.showInUI) coreResourceManager.setResourceVisibility('images', true);
        } else {
            moduleState.automationProgress.imageAutomator = newProgress.toString();
        }
    },

    onGameLoad() {
        const { coreGameStateManager, coreResourceManager, decimalUtility } = coreSystemsRef;
        let loadedState = coreGameStateManager.getModuleState('market');
        const initialState = getInitialState();

        moduleState.purchaseCounts = { ...initialState.purchaseCounts, ...(loadedState?.purchaseCounts || {}) };
        moduleState.automatorLevels = { ...initialState.automatorLevels, ...(loadedState?.automatorLevels || {}) };
        moduleState.automationProgress = { ...initialState.automationProgress, ...(loadedState?.automationProgress || {}) };
        
        Object.keys(moduleState.purchaseCounts).forEach(key => {
            moduleState.purchaseCounts[key] = decimalUtility.new(moduleState.purchaseCounts[key] || "0").toString();
        });

        this.isMarketTabUnlocked(); 
        const imagesRes = coreResourceManager.getResource('images');
        if (imagesRes && imagesRes.isUnlocked && decimalUtility.gt(imagesRes.amount, 0) && !imagesRes.showInUI) {
            coreResourceManager.setResourceVisibility('images', true);
        }
    },

    onResetState() {
        const { coreGameStateManager, coreResourceManager, decimalUtility } = coreSystemsRef;
        const initialState = getInitialState();
        Object.assign(moduleState, initialState); 
        coreGameStateManager.setModuleState('market', { ...moduleState }); 
        coreGameStateManager.setGlobalFlag('marketTabPermanentlyUnlocked', false);

        // Reset all feature unlock flags managed by the market
        Object.values(staticModuleData.featureUnlocks).forEach(unlock => {
            coreGameStateManager.setGlobalFlag(unlock.flagToSet, false);
            coreGameStateManager.setGlobalFlag(`marketUnlock_${unlock.flagToSet}_purchased`, false);
        });
        
        const imagesDef = staticModuleData.resources.images;
        if (imagesDef) {
            coreResourceManager.defineResource(imagesDef.id, imagesDef.name, decimalUtility.new(imagesDef.initialAmount), false, false, imagesDef.hasProductionRate);
        }

        const pspDef = staticModuleData.resources.prestigeSkillPoints;
        if (pspDef) {
            coreResourceManager.defineResource(pspDef.id, pspDef.name, decimalUtility.new(pspDef.initialAmount), false, false, pspDef.hasProductionRate);
        }
    }
};
