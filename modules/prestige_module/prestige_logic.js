// /game/modules/prestige_module/prestige_logic.js (v5.0 - Manual Skill Implementation)
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
};

export const getOwnedPrestigeProducerCount = (producerId) => {
    return decimalUtility.new(moduleState.ownedProducers[producerId] || '0');
};

export const getTotalPrestigeCount = () => {
    return decimalUtility.new(moduleState.totalPrestigeCount || '0');
};

export const calculatePrestigeProducerCost = (producerId, quantity = 1) => {
    const producerDef = prestigeData.producers[producerId];
    if (!producerDef) return decimalUtility.new(Infinity);

    const n = decimalUtility.new(quantity);
    if (decimalUtility.eq(n, 0)) return decimalUtility.new(0);

    const baseCost = decimalUtility.new(producerDef.baseCost);
    const growth = decimalUtility.new(producerDef.costGrowthFactor);
    const owned = getOwnedPrestigeProducerCount(producerId);

    if (decimalUtility.eq(growth, 1)) {
        return decimalUtility.multiply(baseCost, n);
    }
    
    const futureCostMultiplier = decimalUtility.power(growth, owned);
    const sumMultiplier = decimalUtility.divide(
        decimalUtility.subtract(decimalUtility.power(growth, n), 1),
        decimalUtility.subtract(growth, 1)
    );

    return decimalUtility.multiply(baseCost, decimalUtility.multiply(futureCostMultiplier, sumMultiplier));
};

export const calculateMaxBuyablePrestigeProducer = (producerId) => {
    const { coreResourceManager, decimalUtility } = coreSystemsRef;
    const producerDef = prestigeData.producers[producerId];
    if (!producerDef) return decimalUtility.new(0);
    
    const availableCurrency = coreResourceManager.getAmount(producerDef.costResource);
    const owned = getOwnedPrestigeProducerCount(producerId);
    const baseCost = decimalUtility.new(producerDef.baseCost);
    const growth = decimalUtility.new(producerDef.costGrowthFactor);
    
    if (decimalUtility.eq(owned, 0) && decimalUtility.gt(baseCost, availableCurrency)) {
        return decimalUtility.new(0);
    }

    if (decimalUtility.eq(growth, 1)) {
        const costOfOne = calculatePrestigeProducerCost(producerId, 1);
        if (decimalUtility.eq(costOfOne, 0) || decimalUtility.gt(costOfOne, availableCurrency)) return decimalUtility.new(0);
        return decimalUtility.floor(decimalUtility.divide(availableCurrency, costOfOne));
    }

    const costOfNext = decimalUtility.multiply(baseCost, decimalUtility.power(growth, owned));
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
    const { decimalUtility, moduleLoader, loggingSystem, coreGameStateManager } = coreSystemsRef;
    
    const studiesModule = moduleLoader.getModule('studies');
    if (!studiesModule || !studiesModule.logic.addProducers) {
        return; 
    }

    let producersToAdd = {};
    let stateNeedsUpdate = false;

    for (const producerId in prestigeData.producers) {
        const producerDef = prestigeData.producers[producerId];
        const ownedCount = getOwnedPrestigeProducerCount(producerId);

        if (!producerDef.passiveProduction || decimalUtility.eq(ownedCount, 0)) {
            continue;
        }

        producerDef.passiveProduction.forEach(target => {
            const baseRate = decimalUtility.new(target.baseRate);
            const totalRate = decimalUtility.multiply(baseRate, ownedCount);
            const generatedThisTick = decimalUtility.multiply(totalRate, deltaTimeSeconds);
            const progressKey = target.producerId;
            if (moduleState.passiveProductionProgress[progressKey] === undefined) {
                moduleState.passiveProductionProgress[progressKey] = '0';
            }
            const currentProgress = decimalUtility.new(moduleState.passiveProductionProgress[progressKey]);
            const newProgress = decimalUtility.add(currentProgress, generatedThisTick);

            if (decimalUtility.gte(newProgress, 1)) {
                const wholeProducers = decimalUtility.floor(newProgress);
                if (!producersToAdd[progressKey]) {
                    producersToAdd[progressKey] = decimalUtility.new(0);
                }
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
    const { coreUpgradeManager, decimalUtility, loggingSystem } = coreSystemsRef;

    for (const producerId in prestigeData.producers) {
        const producerDef = prestigeData.producers[producerId];
        if (producerDef.effect) {
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

export const calculatePrestigeGain = () => {
    if (!coreSystemsRef.coreGameStateManager.getGlobalFlag('prestigeUnlocked', false)) {
        return decimalUtility.new(0);
    }

    const { coreUpgradeManager, coreResourceManager, decimalUtility } = coreSystemsRef;
    const prestigeCount = decimalUtility.new(moduleState.totalPrestigeCount || '0');
    const totalKnowledge = coreResourceManager.getAmount('knowledge');

    const baseGain = decimalUtility.new(1);
    
    const prestigeFactor = decimalUtility.divide(prestigeCount, 6);
    const knowledgeFactor = decimalUtility.divide(totalKnowledge, 1000);
    const formulaGain = decimalUtility.multiply(prestigeFactor, knowledgeFactor);

    let totalGain = decimalUtility.add(baseGain, formulaGain);
    
    const ppGainBonus = coreUpgradeManager.getProductionMultiplier('prestige_mechanics', 'ppGain');
    const globalBonus = coreUpgradeManager.getProductionMultiplier('global_production', 'all');
    
    totalGain = decimalUtility.multiply(totalGain, ppGainBonus);
    totalGain = decimalUtility.multiply(totalGain, globalBonus);

    return totalGain.floor();
};

export const getPrestigeBonusMultiplier = () => {
    const { coreUpgradeManager, coreResourceManager, decimalUtility } = coreSystemsRef;
    const prestigeCount = decimalUtility.new(moduleState.totalPrestigeCount || '0');
    const images = coreResourceManager.getAmount('images') || decimalUtility.new(0);

    const prestigeBonus = decimalUtility.divide(prestigeCount, 6);
    const imageBonus = decimalUtility.divide(images, '1e13'); 

    const prestigeBonusBonus = coreUpgradeManager.getProductionMultiplier('prestige_mechanics', 'prestigeBonus');
    
    let totalBonus = decimalUtility.add(1, decimalUtility.add(prestigeBonus, imageBonus));
    totalBonus = decimalUtility.multiply(totalBonus, prestigeBonusBonus);
    
    return totalBonus;
};

export const performPrestige = () => {
    const { coreUIManager, coreResourceManager, moduleLoader, coreGameStateManager, decimalUtility, loggingSystem } = coreSystemsRef;

    if (!canPrestige()) {
        coreUIManager.showNotification("Requires 1,000 Images to Prestige.", "error");
        return;
    }
    const ppGains = calculatePrestigeGain();
    if (decimalUtility.lte(ppGains, 0)) {
        coreUIManager.showNotification("You would not gain any Prestige Points.", "warning");
        return;
    }

    // --- MODIFICATION: Get retention values from Skills module ---
    const skillsLogic = moduleLoader.getModule('skills')?.logic;
    let retainedKnowledge = decimalUtility.new(0);
    let retainedSsp = decimalUtility.new(0);
    let startingProducers = {};

    if (skillsLogic) {
        const knowledgeRetainPercent = skillsLogic.getKnowledgeRetentionPercentage();
        if (decimalUtility.gt(knowledgeRetainPercent, 0)) {
            retainedKnowledge = decimalUtility.multiply(coreResourceManager.getAmount('knowledge'), knowledgeRetainPercent);
        }

        const sspRetainPercent = skillsLogic.getSspRetentionPercentage();
        if (decimalUtility.gt(sspRetainPercent, 0)) {
            retainedSsp = decimalUtility.multiply(coreResourceManager.getAmount('studySkillPoints'), sspRetainPercent);
        }
        
        startingProducers = skillsLogic.getStartingProducers();
    }
    
    let keptResourcesMessage = '';
    if (decimalUtility.gt(retainedKnowledge, 0)) {
        keptResourcesMessage += `<li><span class="font-bold text-yellow-300">${decimalUtility.format(retainedKnowledge, 2)}</span> Knowledge</li>`;
    }
    if (decimalUtility.gt(retainedSsp, 0)) {
        keptResourcesMessage += `<li><span class="font-bold text-yellow-300">${decimalUtility.format(retainedSsp, 0)}</span> Study Skill Points</li>`;
    }
    if (Object.keys(startingProducers).length > 0) {
        for(const prodId in startingProducers) {
             keptResourcesMessage += `<li><span class="font-bold text-yellow-300">${decimalUtility.format(startingProducers[prodId], 0)}</span> starting ${prodId}s</li>`;
        }
    }

    const confirmationMessage = `
        <div class="space-y-3 text-left text-textPrimary">
            <p>Are you sure you want to Prestige?</p>
            <div class="p-3 bg-green-900 bg-opacity-50 rounded-lg border border-green-700">
                <p class="font-semibold text-green-300">You will gain:</p>
                <ul class="list-disc list-inside text-sm mt-1 text-textSecondary">
                    <li><span class="font-bold text-green-200">${decimalUtility.format(ppGains, 2, 0)}</span> Prestige Points</li>
                </ul>
            </div>
            ${keptResourcesMessage ? `
            <div class="p-3 bg-yellow-900 bg-opacity-50 rounded-lg border border-yellow-700">
                <p class="font-semibold text-yellow-300">You will keep (from Prestige Skills):</p>
                <ul class="list-disc list-inside text-sm mt-1 text-textSecondary">${keptResourcesMessage}</ul>
            </div>` : ''}
            <div class="p-3 bg-red-900 bg-opacity-50 rounded-lg border border-red-700">
                <p class="font-semibold text-red-300">The following will be reset:</p>
                <ul class="list-disc list-inside text-sm mt-1 text-textSecondary">
                    <li>Study Points, Knowledge, and Images</li>
                    <li>All Study Producers (Students, Classrooms, etc.)</li>
                    <li>Market Item costs and Automator Progress</li>
                    <li>Regular Skill levels and their SSP cost</li>
                </ul>
            </div>
             <p class="text-xs text-gray-400">Achievements, Unlocked Tabs, Prestige Upgrades, Automator Levels, and Prestige Skills are kept.</p>
        </div>
    `;


    coreUIManager.showModal("Confirm Prestige", confirmationMessage, [
            {
                label: `Prestige for ${decimalUtility.format(ppGains, 2, 0)} PP`,
                className: "bg-green-600 hover:bg-green-700",
                callback: () => {
                    const newPrestigeCount = decimalUtility.add(moduleState.totalPrestigeCount || 0, 1);
                    const prestigeRecord = { count: newPrestigeCount.toString(), time: moduleState.currentPrestigeRunTime || 0, ppGained: ppGains.toString() };
                    const newHistory = [prestigeRecord, ...(moduleState.lastTenPrestiges || [])];
                    if (newHistory.length > 10) newHistory.pop();
                    
                    const newSnapshot = {
                        totalStudyPointsProduced: coreResourceManager.getTotalEarned('studyPoints')?.toString() || '0',
                        totalKnowledgeProduced: coreResourceManager.getTotalEarned('knowledge')?.toString() || '0'
                    };

                    coreResourceManager.performPrestigeReset();
                    moduleLoader.broadcastLifecycleEvent('onPrestigeReset');
                    
                    const prestigeModuleState = coreGameStateManager.getModuleState('prestige') || getInitialState();
                    prestigeModuleState.totalPrestigeCount = newPrestigeCount.toString();
                    prestigeModuleState.totalPrestigePointsEverEarned = decimalUtility.add(prestigeModuleState.totalPrestigePointsEverEarned || 0, ppGains).toString();
                    prestigeModuleState.passiveProductionProgress = getInitialState().passiveProductionProgress;
                    prestigeModuleState.lastTenPrestiges = newHistory;
                    prestigeModuleState.currentPrestigeRunTime = 0;
                    prestigeModuleState.statsSnapshotAtPrestige = newSnapshot;

                    coreGameStateManager.setModuleState('prestige', prestigeModuleState);
                    Object.assign(moduleState, prestigeModuleState);
                    coreGameStateManager.setGlobalFlag('hasPrestigedOnce', true);
                    
                    coreResourceManager.addAmount('prestigePoints', ppGains);
                    
                    // --- MODIFICATION: Add back retained resources ---
                    if (decimalUtility.gt(retainedKnowledge, 0)) coreResourceManager.addAmount('knowledge', retainedKnowledge);
                    if (decimalUtility.gt(retainedSsp, 0)) coreResourceManager.addAmount('studySkillPoints', retainedSsp);
                    if (Object.keys(startingProducers).length > 0) {
                        const studiesLogic = moduleLoader.getModule('studies')?.logic;
                        if (studiesLogic) studiesLogic.addProducers(startingProducers);
                    }
                    // --- END MODIFICATION ---

                    coreResourceManager.setResourceVisibility('prestigePoints', true);
                    updatePrestigeProducerEffects();
                    coreUIManager.fullUIRefresh();
                    coreUIManager.showNotification("You have Prestiged! Your progress has been reset for greater power.", "success", 5000);
                    coreUIManager.closeModal();
                }
            },
            { label: "Not yet", className:"bg-gray-600 hover:bg-gray-700", callback: () => coreUIManager.closeModal() }
        ]
    );
};
