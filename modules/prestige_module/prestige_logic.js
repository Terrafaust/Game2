// /game/modules/prestige_module/prestige_logic.js (v2.9 - UI Function Fix)
import { coreGameStateManager } from '../../js/core/coreGameStateManager.js';
import { coreResourceManager } from '../../js/core/coreResourceManager.js';
import { moduleLoader } from '../../js/core/moduleLoader.js';
import { decimalUtility } from '../../js/core/decimalUtility.js';
import { coreUIManager } from '../../js/core/coreUIManager.js';
import { prestigeData } from './prestige_data.js';
import { moduleState, getInitialState } from './prestige_state.js';

let coreSystemsRef;

export const initialize = (systems) => {
    coreSystemsRef = systems;
};

export const getOwnedPrestigeProducerCount = (producerId) => {
    return decimalUtility.new(moduleState.ownedProducers[producerId] || '0');
};

// --- FIX: Added the missing function for the UI ---
/**
 * Gets the total number of times the player has prestiged.
 * @returns {Decimal} The total prestige count.
 */
export const getTotalPrestigeCount = () => {
    return decimalUtility.new(moduleState.totalPrestigeCount || '0');
};
// --- END FIX ---

export const calculatePrestigeProducerCost = (producerId) => {
    const producerDef = prestigeData.producers[producerId];
    if (!producerDef) return decimalUtility.new(Infinity);

    const baseCost = decimalUtility.new(producerDef.baseCost);
    const growth = decimalUtility.new(producerDef.costGrowthFactor);
    const owned = getOwnedPrestigeProducerCount(producerId);
    
    return decimalUtility.multiply(baseCost, decimalUtility.power(growth, owned));
};

export const purchasePrestigeProducer = (producerId) => {
    const cost = calculatePrestigeProducerCost(producerId);
    if (coreResourceManager.canAfford('prestigePoints', cost)) {
        coreResourceManager.spendAmount('prestigePoints', cost);
        
        const currentState = coreGameStateManager.getModuleState('prestige');
        currentState.ownedProducers[producerId] = decimalUtility.add(currentState.ownedProducers[producerId] || 0, 1).toString();
        coreGameStateManager.setModuleState('prestige', currentState);
        
        Object.assign(moduleState, currentState);

        updatePrestigeProducerEffects();

        coreUIManager.showNotification(`Purchased 1 ${prestigeData.producers[producerId].name}!`, 'success');
        
        const prestigeUI = moduleLoader.getModule('prestige').ui;
        if(prestigeUI && coreUIManager.isActiveTab('prestige')) {
            prestigeUI.updateDynamicElements();
        }
        return true;
    } else {
        coreUIManager.showNotification(`Not enough Prestige Points.`, 'error');
        return false;
    }
};

export const processPassiveProducerGeneration = (deltaTimeSeconds) => {
    if (!coreSystemsRef) return;
    const { decimalUtility, coreUpgradeManager, moduleLoader, loggingSystem, coreGameStateManager } = coreSystemsRef;
    
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

    const postDocDef = prestigeData.producers.postDoc;
    if (postDocDef && postDocDef.effect) {
        const postDocCount = getOwnedPrestigeProducerCount('postDoc');
        
        const postDocEffectValueProvider = () => {
            let multiplier = decimalUtility.add(1, decimalUtility.multiply(postDocCount, decimalUtility.new(postDocDef.effect.valuePerLevel)));
            const postDocSkillBonus = coreUpgradeManager.getProductionMultiplier('prestige_producers', 'postDoc');
            multiplier = decimalUtility.multiply(multiplier, postDocSkillBonus);
            return multiplier;
        };

        coreUpgradeManager.registerEffectSource('prestige', 'postDoc_prestige_producer_multiplier', postDocDef.effect.targetSystem, postDocDef.effect.targetId, postDocDef.effect.type, postDocEffectValueProvider);
        loggingSystem.debug("PrestigeLogic", "Registered/Updated postDoc effect with CoreUpgradeManager.");
    }
};

export const canPrestige = () => {
    return coreSystemsRef.coreGameStateManager.getGlobalFlag('prestigeUnlocked', false);
};

export const calculatePrestigeGain = () => {
    if (!canPrestige()) return decimalUtility.new(0);

    const { coreUpgradeManager, coreGameStateManager, coreResourceManager, decimalUtility } = coreSystemsRef;
    const prestigeCount = decimalUtility.new(moduleState.totalPrestigeCount || '0');
    const totalKnowledge = coreResourceManager.getAmount('knowledge');

    const baseGain = decimalUtility.new(1);
    const prestigeCountContribution = decimalUtility.divide(prestigeCount, 6);
    const knowledgeContribution = decimalUtility.divide(totalKnowledge, 10000); 

    let totalGain = decimalUtility.add(baseGain, prestigeCountContribution);
    totalGain = decimalUtility.add(totalGain, knowledgeContribution);
    
    const ppGainBonus = coreUpgradeManager.getProductionMultiplier('prestige_mechanics', 'ppGain');
    totalGain = decimalUtility.multiply(totalGain, ppGainBonus);

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
    const { coreUIManager, coreResourceManager, moduleLoader, coreGameStateManager, decimalUtility } = coreSystemsRef;

    if (!canPrestige()) {
        coreUIManager.showNotification("You have not unlocked the ability to Prestige yet.", "error");
        return;
    }

    const ppGains = calculatePrestigeGain();
    if (decimalUtility.lte(ppGains, 0)) {
        coreUIManager.showNotification("You would not gain any Prestige Points.", "warning");
        return;
    }

    const prestigeCount = decimalUtility.new(moduleState.totalPrestigeCount || '0');
    const totalKnowledge = coreResourceManager.getAmount('knowledge');

    const baseGainDisplay = decimalUtility.new(1);
    const prestigeCountContribDisplay = decimalUtility.divide(prestigeCount, 6);
    const knowledgeContribDisplay = decimalUtility.divide(totalKnowledge, 10000);
    const ppGainBonus = coreSystemsRef.coreUpgradeManager.getProductionMultiplier('prestige_mechanics', 'ppGain');
    const totalGainBeforeBonus = decimalUtility.add(baseGainDisplay, decimalUtility.add(prestigeCountContribDisplay, knowledgeContribDisplay));

    const confirmationMessage = `
        <div class="space-y-3 text-left text-textPrimary">
            <p>Are you sure you want to Prestige?</p>
            <div class="p-3 bg-green-900 bg-opacity-50 rounded-lg border border-green-700">
                <p class="font-semibold text-green-300">You will gain:</p>
                <ul class="list-disc list-inside text-sm mt-1 text-textSecondary">
                    <li><span class="font-bold text-green-200">${decimalUtility.format(ppGains, 2, 0)}</span> Prestige Points</li>
                </ul>
                <p class="mt-2 text-xs text-green-400">Calculation: </p>
                <ul class="list-disc list-inside text-xs text-green-400">
                    <li>Base: ${decimalUtility.format(baseGainDisplay, 0)}</li>
                    <li>Prestige Count Bonus: ${decimalUtility.format(prestigeCountContribDisplay, 2, 0)} (Total Prestige Count / 6)</li>
                    <li>Knowledge Bonus: ${decimalUtility.format(knowledgeContribDisplay, 2, 0)} (Total Knowledge / 10,000)</li>
                    <li>Subtotal: ${decimalUtility.format(totalGainBeforeBonus, 2, 0)}</li>
                    <li>Multiplier from skills/achievements: ${decimalUtility.format(ppGainBonus, 2)}x</li>
                </ul>
            </div>
            <div class="p-3 bg-red-900 bg-opacity-50 rounded-lg border border-red-700">
                <p class="font-semibold text-red-300">The following will be reset:</p>
                <ul class="list-disc list-inside text-sm mt-1 text-textSecondary">
                    <li>Study Points, Knowledge, and Images</li>
                    <li>All Study Producers (Students, Classrooms, etc.)</li>
                    <li>Market Item costs</li>
                    <li>Study Skill Points (SSP) and all purchased Skill levels</li>
                </ul>
            </div>
             <p class="text-xs text-gray-400">Achievements, Unlocked Tabs, and Prestige Upgrades are kept.</p>
        </div>
    `;

    coreUIManager.showModal("Confirm Prestige", confirmationMessage, [
            {
                label: `Prestige for ${decimalUtility.format(ppGains, 2, 0)} PP`,
                className: "bg-green-600 hover:bg-green-700",
                callback: () => {
                    coreResourceManager.performPrestigeReset();
                    moduleLoader.broadcastLifecycleEvent('onPrestigeReset');
                    
                    const prestigeModuleState = coreGameStateManager.getModuleState('prestige') || getInitialState();
                    prestigeModuleState.totalPrestigeCount = decimalUtility.add(prestigeModuleState.totalPrestigeCount || 0, 1).toString();
                    prestigeModuleState.totalPrestigePointsEverEarned = decimalUtility.add(prestigeModuleState.totalPrestigePointsEverEarned || 0, ppGains).toString();
                    
                    prestigeModuleState.passiveProductionProgress = getInitialState().passiveProductionProgress;

                    coreGameStateManager.setModuleState('prestige', prestigeModuleState);
                    Object.assign(moduleState, prestigeModuleState);
                    
                    coreGameStateManager.setGlobalFlag('hasPrestigedOnce', true);
                    
                    coreResourceManager.addAmount('prestigePoints', ppGains);
                    
                    coreResourceManager.setResourceVisibility('prestigePoints', true);
                    coreResourceManager.setResourceVisibility('prestigeCount', true);
                    
                    updatePrestigeProducerEffects();

                    coreUIManager.fullUIRefresh();
                    coreUIManager.showNotification("You have Prestiged! This might affect your production rates.", "success", 5000);
                    coreUIManager.closeModal();
                }
            },
            { label: "Not yet", className:"bg-gray-600 hover:bg-gray-700", callback: () => coreUIManager.closeModal() }
        ]
    );
};
