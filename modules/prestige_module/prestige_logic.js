// /game/modules/prestige_module/prestige_logic.js (v2.0 - Full Implementation)
import { coreGameStateManager } from '../../js/core/coreGameStateManager.js';
import { coreResourceManager } from '../../js/core/coreResourceManager.js';
import { moduleLoader } from '../../js/core/moduleLoader.js';
import { decimalUtility } from '../../js/core/decimalUtility.js';
import { coreUIManager } from '../../js/core/coreUIManager.js';
import { prestigeData } from './prestige_data.js';
import { staticModuleData as skillsData } from '../../modules/skills_module/skills_data.js';

let coreSystemsRef; // Will be initialized from manifest

export const initialize = (systems) => {
    coreSystemsRef = systems;
};

export const getOwnedPrestigeProducerCount = (producerId) => {
    const state = coreGameStateManager.getModuleState('prestige');
    return decimalUtility.new(state.ownedProducers[producerId] || '0');
};

export const calculatePrestigeProducerCost = (producerId) => {
    const producerDef = prestigeData.producers[producerId];
    if (!producerDef) return decimalUtility.new(Infinity);

    const baseCost = decimalUtility.new(producerDef.baseCost);
    const growth = decimalUtility.new(producerDef.costGrowthFactor);
    const owned = getOwnedPrestigeProducerCount(producerId);
    
    // Formula: base * growth^owned
    return decimalUtility.multiply(baseCost, decimalUtility.power(growth, owned));
};

export const purchasePrestigeProducer = (producerId) => {
    const cost = calculatePrestigeProducerCost(producerId);
    if (coreResourceManager.canAfford('ascensionPoints', cost)) {
        coreResourceManager.spendAmount('ascensionPoints', cost);
        
        const state = coreGameStateManager.getModuleState('prestige');
        state.ownedProducers[producerId] = decimalUtility.add(state.ownedProducers[producerId] || 0, 1).toString();
        coreGameStateManager.setModuleState('prestige', state);

        coreUIManager.showNotification(`Purchased 1 ${prestigeData.producers[producerId].name}!`, 'success');
        
        // Refresh UI
        const prestigeUI = moduleLoader.getModule('prestige').ui;
        if(prestigeUI && coreUIManager.isActiveTab('prestige')) {
            prestigeUI.updateDynamicElements();
        }
        return true;
    } else {
        coreUIManager.showNotification(`Not enough Ascension Points.`, 'error');
        return false;
    }
};

export const updateAllPrestigeProducerProductions = () => {
    const { coreUpgradeManager } = coreSystemsRef;
    const studiesModule = moduleLoader.getModule('studies');
    if (!studiesModule || !studiesModule.logic) return;

    // Get the Post-Doc multiplier
    const postDocDef = prestigeData.producers.postDoc;
    const postDocCount = getOwnedPrestigeProducerCount('postDoc');
    let postDocMultiplier = decimalUtility.add(1, decimalUtility.multiply(postDocCount, postDocDef.effect.valuePer));
    // Apply prestige skill bonus to post-doc
    const postDocSkillBonus = coreUpgradeManager.getProductionMultiplier('prestige_producers', 'postDoc');
    postDocMultiplier = decimalUtility.multiply(postDocMultiplier, postDocSkillBonus);


    for (const producerId in prestigeData.producers) {
        if (!prestigeData.producers[producerId].production) continue; // Skip non-producing items like postDoc

        const producerDef = prestigeData.producers[producerId];
        let owned = getOwnedPrestigeProducerCount(producerId);
        if (decimalUtility.eq(owned, 0)) continue;

        // Apply skill multiplier for this specific producer
        const skillMultiplier = coreUpgradeManager.getProductionMultiplier('prestige_producers', producerId);
        // Apply achievement multiplier
        const achMultiplier = coreUpgradeManager.getProductionMultiplier('prestige_producers', producerId);

        // Calculate total effective producers
        let effectiveProducers = decimalUtility.multiply(owned, postDocMultiplier);
        effectiveProducers = decimalUtility.multiply(effectiveProducers, skillMultiplier);
        effectiveProducers = decimalUtility.multiply(effectiveProducers, achMultiplier);


        producerDef.production.forEach(prod => {
            const productionPerSecond = decimalUtility.multiply(prod.base, effectiveProducers);
            studiesModule.logic.addGeneratedUnits(prod.producerId, productionPerSecond);
        });
    }
};

export const canPrestige = () => {
    const studiesState = coreGameStateManager.getModuleState('studies');
    if (!studiesState || !studiesState.ownedProducers) return false;
    const professorCount = decimalUtility.new(studiesState.ownedProducers.professor || '0');
    return decimalUtility.gte(professorCount, 10);
};

export const calculateAscensionGain = () => {
    const { coreUpgradeManager } = coreSystemsRef;
    if (!canPrestige()) return decimalUtility.new(0);

    const prestigeState = coreGameStateManager.getModuleState('prestige');
    const prestigeCount = decimalUtility.new(prestigeState.totalAscensionCount || '0');
    const knowledge = coreResourceManager.getAmount('knowledge');

    const prestigeMultiplier = decimalUtility.add(decimalUtility.multiply(prestigeCount, 0.5), 1);
    const knowledgeFactor = decimalUtility.divide(knowledge, 1000);
    
    // Get bonus from skills/achievements
    const apGainBonus = coreUpgradeManager.getProductionMultiplier('prestige_mechanics', 'apGain');

    let totalGain = decimalUtility.multiply(prestigeMultiplier, knowledgeFactor);
    totalGain = decimalUtility.multiply(totalGain, apGainBonus);

    return totalGain.floor();
};

export const getPrestigeBonusMultiplier = () => {
    const { coreUpgradeManager } = coreSystemsRef;
    const prestigeState = coreGameStateManager.getModuleState('prestige');
    const prestigeCount = decimalUtility.new(prestigeState.totalAscensionCount || '0');
    const images = coreResourceManager.getAmount('images') || decimalUtility.new(0);

    const prestigeBonus = decimalUtility.divide(prestigeCount, 6);
    const imageBonus = decimalUtility.divide(images, '1e13'); // Corrected from 10e12

    // Get bonus from skills/achievements
    const prestigeBonusBonus = coreUpgradeManager.getProductionMultiplier('prestige_mechanics', 'prestigeBonus');
    
    let totalBonus = decimalUtility.add(1, decimalUtility.add(prestigeBonus, imageBonus));
    totalBonus = decimalUtility.multiply(totalBonus, prestigeBonusBonus);
    
    return totalBonus;
};

export const performPrestige = () => {
    if (!canPrestige()) {
        coreUIManager.showNotification("You need at least 10 Professors to Ascend.", "error");
        return;
    }
    const apGains = calculateAscensionGain();
    if (decimalUtility.lte(apGains, 0)) {
        coreUIManager.showNotification("You would not gain any Ascension Points. Acquire more Knowledge.", "warning");
        return;
    }
    const confirmationMessage = `<div class="text-left p-4 bg-gray-800 rounded-lg">...</div>`; // Kept short for brevity
    coreUIManager.showModal("Confirm Ascension", confirmationMessage, [
            {
                label: `Ascend for ${decimalUtility.format(apGains, 2, 0)} AP`,
                className: "bg-green-600 hover:bg-green-700",
                callback: () => {
                    moduleLoader.broadcastLifecycleEvent('onBeforePrestige', { apGains: apGains });
                    moduleLoader.broadcastLifecycleEvent('onPrestigeReset');
                    coreResourceManager.performPrestigeReset();

                    const currentState = coreGameStateManager.getModuleState('prestige');
                    currentState.totalAscensionCount = decimalUtility.add(currentState.totalAscensionCount, 1).toString();
                    currentState.totalAscensionPointsEverEarned = decimalUtility.add(currentState.totalAscensionPointsEverEarned, apGains).toString();
                    coreGameStateManager.setModuleState('prestige', currentState);
                    coreGameStateManager.setGlobalFlag('hasPrestigedOnce', true);
                    
                    coreResourceManager.addAmount('ascensionPoints', apGains);

                    // Add starting items from prestige skills
                    const skillsModule = moduleLoader.getModule('skills');
                    if (skillsModule) {
                        const startingAdvantageLevel = skillsModule.logic.getSkillLevel('startingAdvantage');
                        if (startingAdvantageLevel > 0) {
                            const studiesModule = moduleLoader.getModule('studies');
                            studiesModule.logic.addGeneratedUnits('student', startingAdvantageLevel * 10);
                            studiesModule.logic.addGeneratedUnits('classroom', startingAdvantageLevel * 5);
                        }
                    }

                    coreUIManager.fullUIRefresh();
                    coreUIManager.showNotification("You have Ascended!", "success", 5000);
                    coreUIManager.closeModal();
                }
            },
            { label: "Not yet", callback: () => coreUIManager.closeModal() }
        ]
    );
};
