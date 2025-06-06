// /game/modules/prestige_module/prestige_logic.js (v2.2 - Unlock Condition Changed)
import { coreGameStateManager } from '../../js/core/coreGameStateManager.js';
import { coreResourceManager } from '../../js/core/coreResourceManager.js';
import { moduleLoader } from '../../js/core/moduleLoader.js';
import { decimalUtility } from '../../js/core/decimalUtility.js';
import { coreUIManager } from '../../js/core/coreUIManager.js';
import { prestigeData } from './prestige_data.js';
import { moduleState } from './prestige_state.js';

let coreSystemsRef;

export const initialize = (systems) => {
    coreSystemsRef = systems;
};

export const getOwnedPrestigeProducerCount = (producerId) => {
    return decimalUtility.new(moduleState.ownedProducers[producerId] || '0');
};

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

export const updateAllPrestigeProducerProductions = (deltaTime) => {
    const { coreUpgradeManager } = coreSystemsRef;
    const studiesModule = moduleLoader.getModule('studies');
    if (!studiesModule || !studiesModule.logic) return;

    const postDocDef = prestigeData.producers.postDoc;
    const postDocCount = getOwnedPrestigeProducerCount('postDoc');
    let postDocMultiplier = decimalUtility.add(1, decimalUtility.multiply(postDocCount, postDocDef.effect.valuePer));
    const postDocSkillBonus = coreUpgradeManager.getProductionMultiplier('prestige_producers', 'postDoc');
    postDocMultiplier = decimalUtility.multiply(postDocMultiplier, postDocSkillBonus);


    for (const producerId in prestigeData.producers) {
        if (!prestigeData.producers[producerId].production) continue;

        const producerDef = prestigeData.producers[producerId];
        let owned = getOwnedPrestigeProducerCount(producerId);
        if (decimalUtility.eq(owned, 0)) continue;

        const skillMultiplier = coreUpgradeManager.getProductionMultiplier('prestige_producers', producerId);
        const achMultiplier = coreUpgradeManager.getProductionMultiplier('prestige_producers', producerId);

        let effectiveProducers = decimalUtility.multiply(owned, postDocMultiplier);
        effectiveProducers = decimalUtility.multiply(effectiveProducers, skillMultiplier);
        effectiveProducers = decimalUtility.multiply(effectiveProducers, achMultiplier);

        producerDef.production.forEach(prod => {
            const productionPerTick = decimalUtility.multiply(decimalUtility.multiply(prod.base, effectiveProducers), deltaTime);
            studiesModule.logic.addGeneratedUnits(prod.producerId, productionPerTick);
        });
    }
};

export const canPrestige = () => {
    return coreSystemsRef.coreGameStateManager.getGlobalFlag('prestigeUnlocked', false);
};

export const calculatePrestigeGain = () => {
    if (!canPrestige()) return decimalUtility.new(0);

    const { coreUpgradeManager } = coreSystemsRef;
    const prestigeCount = decimalUtility.new(moduleState.totalPrestigeCount || '0');
    const totalPPSpent = decimalUtility.new(moduleState.totalPrestigePointsEverEarned || '0');

    const part1 = decimalUtility.divide(prestigeCount, 6);
    const part2 = 1;
    const part3 = decimalUtility.divide(totalPPSpent, '1e30');
    
    let totalGain = decimalUtility.add(part1, part2);
    totalGain = decimalUtility.add(totalGain, part3);
    
    const ppGainBonus = coreUpgradeManager.getProductionMultiplier('prestige_mechanics', 'ppGain');
    totalGain = decimalUtility.multiply(totalGain, ppGainBonus);

    return totalGain.floor();
};

export const getPrestigeBonusMultiplier = () => {
    const { coreUpgradeManager } = coreSystemsRef;
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

    const confirmationMessage = `
        <div class="space-y-3 text-left text-textPrimary">
            <p>Are you sure you want to Prestige?</p>
            <div class="p-3 bg-green-900 bg-opacity-50 rounded-lg border border-green-700">
                <p class="font-semibold text-green-300">You will gain:</p>
                <ul class="list-disc list-inside text-sm mt-1 text-textSecondary">
                    <li>${decimalUtility.format(ppGains, 2, 0)} Prestige Points</li>
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
                    
                    coreGameStateManager.setModuleState('prestige', prestigeModuleState);
                    Object.assign(moduleState, prestigeModuleState);
                    
                    coreGameStateManager.setGlobalFlag('hasPrestigedOnce', true);
                    
                    coreResourceManager.addAmount('prestigePoints', ppGains);
                    
                    coreResourceManager.setResourceVisibility('prestigePoints', true);
                    coreResourceManager.setResourceVisibility('prestigeCount', true);
                    
                    coreUIManager.fullUIRefresh();
                    coreUIManager.showNotification("You have Prestiged!", "success", 5000);
                    coreUIManager.closeModal();
                }
            },
            { label: "Not yet", className:"bg-gray-600 hover:bg-gray-700", callback: () => coreUIManager.closeModal() }
        ]
    );
};
