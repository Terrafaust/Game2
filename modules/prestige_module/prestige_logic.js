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

export const updateAllPrestigeProducerProductions = (deltaTime) => {
    // This function's logic remains the same
    const { coreUpgradeManager, moduleLoader } = coreSystemsRef;
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

/**
 * NEW UNLOCK LOGIC: Checks if the player has at least 1000 images.
 * @returns {boolean}
 */
export const canPrestige = () => {
    const imageAmount = coreResourceManager.getAmount('images');
    return decimalUtility.gte(imageAmount, 1000);
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
    // This function's logic remains the same
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
    if (!canPrestige()) {
        // Updated error message to reflect new requirement
        coreUIManager.showNotification("You need at least 1,000 Images to Prestige.", "error");
        return;
    }
    const ppGains = calculatePrestigeGain();
    if (decimalUtility.lte(ppGains, 0)) {
        coreUIManager.showNotification("You would not gain any Prestige Points.", "warning");
        return;
    }

    const confirmationMessage = `...`; // Omitted for brevity
    coreUIManager.showModal("Confirm Prestige", confirmationMessage, [
            {
                label: `Prestige for ${decimalUtility.format(ppGains, 2, 0)} PP`,
                className: "bg-green-600 hover:bg-green-700",
                callback: () => {
                    moduleLoader.broadcastLifecycleEvent('onBeforePrestige', { ppGains });
                    moduleLoader.broadcastLifecycleEvent('onPrestigeReset');
                    coreResourceManager.performPrestigeReset();

                    moduleState.totalPrestigeCount = decimalUtility.add(moduleState.totalPrestigeCount, 1).toString();
                    moduleState.totalPrestigePointsEverEarned = decimalUtility.add(moduleState.totalPrestigePointsEverEarned, ppGains).toString();
                    
                    coreGameStateManager.setGlobalFlag('hasPrestigedOnce', true);
                    
                    coreResourceManager.addAmount('prestigePoints', ppGains);
                    coreResourceManager.setAmount('prestigeCount', moduleState.totalPrestigeCount);
                    
                    coreResourceManager.setResourceVisibility('prestigePoints', true);
                    coreResourceManager.setResourceVisibility('prestigeCount', true);

                    coreGameStateManager.setModuleState('prestige', { ...moduleState });
                    
                    coreUIManager.fullUIRefresh();
                    coreUIManager.showNotification("You have Prestiged!", "success", 5000);
                    coreUIManager.closeModal();
                }
            },
            { label: "Not yet", callback: () => coreUIManager.closeModal() }
        ]
    );
};
