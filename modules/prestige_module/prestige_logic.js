// /game/modules/prestige_module/prestige_logic.js (v8.0 - Refactored for UI)
import { coreGameStateManager } from '../../js/core/coreGameStateManager.js';
import { coreResourceManager } from '../../js/core/coreResourceManager.js';
import { moduleLoader } from '../../js/core/moduleLoader.js';
import { decimalUtility } from '../../js/core/decimalUtility.js';
import { coreUIManager } from '../../js/core/coreUIManager.js';
import { buyMultiplierManager } from '../../js/core/buyMultiplierManager.js';
import { prestigeData } from './prestige_data.js';
import { moduleState, getInitialState } from './prestige_state.js';

let coreSystemsRef;

export const initialize = (systems) => {
    coreSystemsRef = systems;
};

export const processPrestigeTick = (deltaTimeSeconds) => {
    if (moduleState.currentPrestigeRunTime !== undefined) {
        moduleState.currentPrestigeRunTime += deltaTimeSeconds;
    } else if (coreSystemsRef.coreGameStateManager.getModuleState('prestige')) {
        moduleState.currentPrestigeRunTime = 0;
    }
    processPassiveProducerGeneration(deltaTimeSeconds);
};

export const getOwnedPrestigeProducerCount = (producerId) => {
    return decimalUtility.new(moduleState.ownedProducers[producerId] || '0');
};

export const getTotalPrestigeCount = () => {
    return decimalUtility.new(moduleState.totalPrestigeCount || '0');
};

export const getTotalPPEarned = () => {
    return decimalUtility.new(moduleState.totalPrestigePointsEverEarned || '0');
}

export const getPostDocMultiplier = () => {
    if (!coreSystemsRef) return decimalUtility.new(1);
    const { decimalUtility } = coreSystemsRef;
    const owned = getOwnedPrestigeProducerCount('postDoc');
    if (decimalUtility.eq(owned, 0)) {
        return decimalUtility.new(1);
    }
    return decimalUtility.power('1.08', owned);
};

export const calculatePrestigeProducerCost = (producerId, quantity = 1) => {
    const { decimalUtility, coreUpgradeManager } = coreSystemsRef;
    const producerDef = prestigeData.producers[producerId];
    if (!producerDef) return decimalUtility.new(Infinity);

    const n = decimalUtility.new(quantity);
    if (decimalUtility.eq(n, 0)) return decimalUtility.new(0);

    const baseCost = decimalUtility.new(producerDef.baseCost);
    const growth = decimalUtility.new(producerDef.costGrowthFactor);
    const owned = getOwnedPrestigeProducerCount(producerId);

    const costReductionMultiplier = coreUpgradeManager.getCostReductionMultiplier('prestige_producers', producerId);
    const effectiveBaseCost = decimalUtility.multiply(baseCost, costReductionMultiplier);

    if (decimalUtility.eq(growth, 1)) {
        return decimalUtility.multiply(effectiveBaseCost, n);
    }
    
    const futureCostMultiplier = decimalUtility.power(growth, owned);
    const sumMultiplier = decimalUtility.divide(
        decimalUtility.subtract(decimalUtility.power(growth, n), 1),
        decimalUtility.subtract(growth, 1)
    );

    return decimalUtility.multiply(effectiveBaseCost, decimalUtility.multiply(futureCostMultiplier, sumMultiplier));
};

export const calculateMaxBuyablePrestigeProducer = (producerId) => {
    const { coreResourceManager, decimalUtility, coreUpgradeManager } = coreSystemsRef;
    const producerDef = prestigeData.producers[producerId];
    if (!producerDef) return decimalUtility.new(0);
    
    const availableCurrency = coreResourceManager.getAmount(producerDef.costResource);
    const owned = getOwnedPrestigeProducerCount(producerId);
    const baseCost = decimalUtility.new(producerDef.baseCost);
    const growth = decimalUtility.new(producerDef.costGrowthFactor);
    
    const costReductionMultiplier = coreUpgradeManager.getCostReductionMultiplier('prestige_producers', producerId);
    const effectiveBaseCost = decimalUtility.multiply(baseCost, costReductionMultiplier);

    if (decimalUtility.eq(owned, 0) && decimalUtility.gt(effectiveBaseCost, availableCurrency)) {
        return decimalUtility.new(0);
    }

    if (decimalUtility.eq(growth, 1)) {
        if (decimalUtility.lte(effectiveBaseCost, 0) || decimalUtility.gt(effectiveBaseCost, availableCurrency)) return decimalUtility.new(0);
        return decimalUtility.floor(decimalUtility.divide(availableCurrency, effectiveBaseCost));
    }

    const costOfNext = decimalUtility.multiply(effectiveBaseCost, decimalUtility.power(growth, owned));
    if(costOfNext.gt(availableCurrency)) return decimalUtility.new(0);

    const numerator = decimalUtility.add(
        decimalUtility.divide(
            decimalUtility.multiply(availableCurrency, decimalUtility.subtract(growth, 1)),
            costOfNext
        ),
        1
    );

    if (numerator.lte(1)) return decimalUtility.new(0);
    
    const max = decimalUtility.floor(
        decimalUtility.divide(decimalUtility.log10(numerator), decimalUtility.log10(growth))
    );

    return !decimalUtility.eq(max, max) ? decimalUtility.new(0) : max;
};

export const purchasePrestigeProducer = (producerId) => {
    const { coreUIManager, coreResourceManager, coreGameStateManager, moduleLoader, decimalUtility, buyMultiplierManager } = coreSystemsRef;
    const producerDef = prestigeData.producers[producerId];
    if (!producerDef) return false;

    const multiplier = buyMultiplierManager.getMultiplier();
    let quantityToBuy;

    if (multiplier === -1) { 
        quantityToBuy = calculateMaxBuyablePrestigeProducer(producerId);
    } else {
        quantityToBuy = decimalUtility.new(multiplier);
    }

    if (decimalUtility.lte(quantityToBuy, 0)) {
        coreUIManager.showNotification(`Cannot purchase 0 ${producerDef.name}s.`, 'warning');
        return false;
    }

    const totalCost = calculatePrestigeProducerCost(producerId, quantityToBuy);
    const costResource = producerDef.costResource;

    if (coreResourceManager.canAfford(costResource, totalCost)) {
        coreResourceManager.spendAmount(costResource, totalCost);
        
        const currentState = coreGameStateManager.getModuleState('prestige');
        currentState.ownedProducers[producerId] = decimalUtility.add(currentState.ownedProducers[producerId] || 0, quantityToBuy).toString();
        coreGameStateManager.setModuleState('prestige', currentState);
        
        Object.assign(moduleState, currentState);
        updatePrestigeProducerEffects(); 
        coreUIManager.showNotification(`Purchased ${decimalUtility.format(quantityToBuy, 0)} ${producerDef.name}!`, 'success');
        
        const prestigeUI = moduleLoader.getModule('prestige').ui;
        if(prestigeUI && coreUIManager.isActiveTab('prestige')) {
            prestigeUI.updateDynamicElements();
        }
        return true;
    } else {
        coreUIManager.showNotification(`Not enough ${coreResourceManager.getResource(costResource)?.name || 'currency'}.`, 'error');
        return false;
    }
};

export const processPassiveProducerGeneration = (deltaTimeSeconds) => {
    if (!coreSystemsRef) return;
    const { decimalUtility, moduleLoader, loggingSystem, coreGameStateManager, coreUpgradeManager } = coreSystemsRef;
    
    const studiesModule = moduleLoader.getModule('studies');
    if (!studiesModule || !studiesModule.logic.addProducers) {
        return; 
    }

    let producersToAdd = {};
    let stateNeedsUpdate = false;
    
    const postDocMultiplier = getPostDocMultiplier();

    for (const producerId in prestigeData.producers) {
        if (producerId === 'postDoc') continue;

        const producerDef = prestigeData.producers[producerId];
        const ownedCount = getOwnedPrestigeProducerCount(producerId);

        if (!producerDef.passiveProduction || decimalUtility.eq(ownedCount, 0)) {
            continue;
        }

        producerDef.passiveProduction.forEach(target => {
            const baseRate = decimalUtility.new(target.baseRate);
            let totalRate = decimalUtility.multiply(baseRate, ownedCount);
            
            totalRate = decimalUtility.multiply(totalRate, postDocMultiplier);
            const specificMultiplier = coreUpgradeManager.getProductionMultiplier('prestige_producers', producerId);
            totalRate = decimalUtility.multiply(totalRate, specificMultiplier);
            const globalAllMultiplier = coreUpgradeManager.getProductionMultiplier('global_production', 'all');
            totalRate = decimalUtility.multiply(totalRate, globalAllMultiplier);

            const generatedThisTick = decimalUtility.multiply(totalRate, deltaTimeSeconds);
            const progressKey = target.producerId;
            if (moduleState.passiveProductionProgress[progressKey] === undefined) {
                moduleState.passiveProductionProgress[progressKey] = '0';
            }
            const currentProgress = decimalUtility.new(moduleState.passiveProductionProgress[progressKey]);
            const newProgress = decimalUtility.add(currentProgress, generatedThisTick);

            if (decimalUtility.gte(newProgress, 1)) {
                const wholeProducers = decimalUtility.floor(newProgress);
                if (!producersToAdd[progressKey]) producersToAdd[progressKey] = decimalUtility.new(0);
                producersToAdd[progressKey] = decimalUtility.add(producersToAdd[progressKey], wholeProducers);
                moduleState.passiveProductionProgress[progressKey] = decimalUtility.subtract(newProgress, wholeProducers).toString();
                stateNeedsUpdate = true;
            } else {
                moduleState.passiveProductionProgress[progressKey] = newProgress.toString();
            }
        });
    }

    if (Object.keys(producersToAdd).length > 0) {
        studiesModule.logic.addProducers(producersToAdd);
        loggingSystem.debug("PrestigeLogic", "Passively generated producers:", producersToAdd);
    }
    
    if (stateNeedsUpdate) {
        coreGameStateManager.setModuleState('prestige', { ...moduleState });
    }
};

export const updatePrestigeProducerEffects = () => {
    if (!coreSystemsRef) return;
    const { coreUpgradeManager, decimalUtility } = coreSystemsRef;

    for (const producerId in prestigeData.producers) {
        const producerDef = prestigeData.producers[producerId];
        if (producerDef.effect && producerId !== 'postDoc') {
            const producerCount = getOwnedPrestigeProducerCount(producerId);
            const effectValueProvider = () => {
                return decimalUtility.add(1, decimalUtility.multiply(producerCount, decimalUtility.new(producerDef.effect.valuePerLevel)));
            };
            coreUpgradeManager.registerEffectSource('prestige', `${producerId}_effect_multiplier`, producerDef.effect.targetSystem, producerDef.effect.targetId, producerDef.effect.type, effectValueProvider);
        }
    }
};

export const canPrestige = () => {
    const flagUnlocked = coreSystemsRef.coreGameStateManager.getGlobalFlag('prestigeUnlocked', false);
    const hasEnoughImages = coreSystemsRef.coreResourceManager.canAfford('images', 1000);
    return flagUnlocked && hasEnoughImages;
};

/**
 * MODIFIED: Returns an object with the calculated points and an explanation string.
 */
export const calculatePrestigeGain = () => {
    const { coreUpgradeManager, coreResourceManager, decimalUtility, coreGameStateManager } = coreSystemsRef;

    if (!coreGameStateManager.getGlobalFlag('prestigeUnlocked', false)) {
        return { points: decimalUtility.new(0), explanation: "Prestige has not been unlocked yet." };
    }

    const prestigeCount = decimalUtility.new(moduleState.totalPrestigeCount || '0');
    const totalKnowledge = coreResourceManager.getAmount('knowledge');
    const baseGain = decimalUtility.new(1);

    const prestigeFactor = decimalUtility.divide(prestigeCount, 6);
    const knowledgeFactor = decimalUtility.divide(totalKnowledge, 1000);
    const formulaGain = decimalUtility.multiply(prestigeFactor, knowledgeFactor);
    let totalGain = decimalUtility.add(baseGain, formulaGain);

    const ppGainBonus = coreUpgradeManager.getProductionMultiplier('prestige_mechanics', 'ppGain');
    const globalBonus = coreUpgradeManager.getProductionMultiplier('global_production', 'all');

    const finalGain = decimalUtility.multiply(decimalUtility.multiply(totalGain, ppGainBonus), globalBonus).floor();

    const explanation = `(1 + P.Count/6 * Know./1k) * Bonuses = (1 + ${decimalUtility.format(prestigeFactor, 2)} * ${decimalUtility.format(knowledgeFactor,2)}) * ${decimalUtility.format(ppGainBonus, 2)}x * ${decimalUtility.format(globalBonus, 2)}x`;
    
    return { points: finalGain, explanation };
};

/**
 * MODIFIED: Returns an object with the calculated bonus and an explanation string.
 */
export const getPrestigeBonusMultiplier = (prestigeCountOverride = null) => {
    const { coreUpgradeManager, coreResourceManager, decimalUtility } = coreSystemsRef;
    const prestigeCount = prestigeCountOverride !== null ? decimalUtility.new(prestigeCountOverride) : decimalUtility.new(moduleState.totalPrestigeCount || '0');
    const images = coreResourceManager.getAmount('images') || decimalUtility.new(0);

    const prestigeBonus = decimalUtility.divide(prestigeCount, 6);
    const imageBonus = decimalUtility.divide(images, '1e13'); 
    const prestigeBonusBonus = coreUpgradeManager.getProductionMultiplier('prestige_mechanics', 'prestigeBonus');

    let totalBonus = decimalUtility.add(1, decimalUtility.add(prestigeBonus, imageBonus));
    totalBonus = decimalUtility.multiply(totalBonus, prestigeBonusBonus);
    
    const explanation = `(1 + Prestige Bonus + Image Bonus) * Multiplier = (1 + ${decimalUtility.format(prestigeBonus, 2)} + ${decimalUtility.format(imageBonus, 2)}) * ${decimalUtility.format(prestigeBonusBonus, 2)}x`;

    return { bonus: totalBonus, explanation };
};

/**
 * NEW: Gathers all data needed for the prestige confirmation modal.
 */
export const getPrestigeConfirmationDetails = () => {
    const { decimalUtility, moduleLoader, coreResourceManager } = coreSystemsRef;

    if (!canPrestige()) {
        return { canPrestige: false, reason: "Requires 1,000 Images to Prestige." };
    }
    
    const gainInfo = calculatePrestigeGain();
    if (decimalUtility.lte(gainInfo.points, 0)) {
        return { canPrestige: false, reason: "You would not gain any Prestige Points." };
    }
    
    const skillsLogic = moduleLoader.getModule('skills')?.logic;
    let retainedKnowledge = decimalUtility.new(0);
    let retainedSsp = decimalUtility.new(0);
    let startingProducers = {};

    if (skillsLogic) {
        retainedKnowledge = decimalUtility.multiply(coreResourceManager.getAmount('knowledge'), skillsLogic.getKnowledgeRetentionPercentage());
        retainedSsp = decimalUtility.multiply(coreResourceManager.getAmount('studySkillPoints'), skillsLogic.getSspRetentionPercentage());
        startingProducers = skillsLogic.getStartingProducers();
    }
    
    const currentPrestigeCount = getTotalPrestigeCount();
    const nextPrestigeNumber = currentPrestigeCount.add(1);

    const currentBonusInfo = getPrestigeBonusMultiplier();
    const nextBonusInfo = getPrestigeBonusMultiplier(nextPrestigeNumber);

    return {
        canPrestige: true,
        ppGains: gainInfo.points,
        ppGainsExplanation: gainInfo.explanation,
        currentBonus: currentBonusInfo.bonus,
        nextBonus: nextBonusInfo.bonus,
        bonusExplanation: nextBonusInfo.explanation,
        retainedKnowledge,
        retainedSsp,
        startingProducers,
        nextPrestigeNumber
    };
};

/**
 * NEW: Executes the actual prestige reset logic.
 */
export const executePrestigeReset = (ppGains) => {
    const { coreResourceManager, moduleLoader, coreGameStateManager, decimalUtility, loggingSystem } = coreSystemsRef;
    
    const skillsLogic = moduleLoader.getModule('skills')?.logic;
    let retainedKnowledge = decimalUtility.new(0);
    let retainedSsp = decimalUtility.new(0);
    let startingProducers = {};
    if (skillsLogic) {
        retainedKnowledge = decimalUtility.multiply(coreResourceManager.getAmount('knowledge'), skillsLogic.getKnowledgeRetentionPercentage());
        retainedSsp = decimalUtility.multiply(coreResourceManager.getAmount('studySkillPoints'), skillsLogic.getSspRetentionPercentage());
        startingProducers = skillsLogic.getStartingProducers();
    }

    const newPrestigeCount = decimalUtility.add(moduleState.totalPrestigeCount || 0, 1);
    const prestigeRecord = { count: newPrestigeCount.toString(), time: moduleState.currentPrestigeRunTime || 0, ppGained: ppGains.toString() };
    const newHistory = [prestigeRecord, ...(moduleState.lastTenPrestiges || [])].slice(0, 10);
    
    coreResourceManager.performPrestigeReset();
    moduleLoader.broadcastLifecycleEvent('onPrestigeReset');
    
    const prestigeModuleState = coreGameStateManager.getModuleState('prestige') || getInitialState();
    prestigeModuleState.totalPrestigeCount = newPrestigeCount.toString();
    prestigeModuleState.totalPrestigePointsEverEarned = decimalUtility.add(prestigeModuleState.totalPrestigePointsEverEarned || 0, ppGains).toString();
    prestigeModuleState.passiveProductionProgress = getInitialState().passiveProductionProgress;
    prestigeModuleState.lastTenPrestiges = newHistory;
    prestigeModuleState.currentPrestigeRunTime = 0;

    coreGameStateManager.setModuleState('prestige', prestigeModuleState);
    Object.assign(moduleState, prestigeModuleState);
    coreGameStateManager.setGlobalFlag('hasPrestigedOnce', true);
    coreResourceManager.addAmount('prestigePoints', ppGains);
    coreResourceManager.setAmount('prestigeCount', newPrestigeCount);
    
    if (decimalUtility.gt(retainedKnowledge, 0)) coreResourceManager.addAmount('knowledge', retainedKnowledge);
    if (decimalUtility.gt(retainedSsp, 0)) coreResourceManager.addAmount('studySkillPoints', retainedSsp);
    if (Object.keys(startingProducers).length > 0) moduleLoader.getModule('studies')?.logic.addProducers(startingProducers);

    coreResourceManager.setResourceVisibility('prestigePoints', true);
    updatePrestigeProducerEffects();
    coreUIManager.fullUIRefresh();
    coreUIManager.showNotification("You have Prestiged! Your progress has been reset for greater power.", "success", 5000);
};
