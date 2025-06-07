// /game/modules/prestige_module/prestige_logic.js (v2.4 - Prestige Calc and Producer Fixes)
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

        // After purchasing a producer, update its effect registration with coreUpgradeManager
        // This ensures the multiplier is recalculated and applied immediately.
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

/**
 * Recalculates and registers/updates all prestige producer effects with the coreUpgradeManager
 * and sets their production rates in coreResourceManager.
 * This should be called when prestige producers are purchased or game state loads.
 */
export const updatePrestigeProducerEffects = () => {
    if (!coreSystemsRef) return;
    const { coreUpgradeManager, decimalUtility, loggingSystem, coreResourceManager } = coreSystemsRef;

    // First, handle the 'postDoc' producer's effect (multiplier on other prestige producers)
    const postDocDef = prestigeData.producers.postDoc;
    if (postDocDef && postDocDef.effect) {
        const postDocCount = getOwnedPrestigeProducerCount('postDoc');
        
        const postDocEffectValueProvider = () => {
            // Note: postDocDef.effect.valuePer was renamed to valuePerLevel in prestige_data.js
            let multiplier = decimalUtility.add(1, decimalUtility.multiply(postDocCount, decimalUtility.new(postDocDef.effect.valuePerLevel)));
            // Apply skill bonuses to postDoc effect if applicable (example: prestige_producers_postDoc_MULTIPLIER)
            const postDocSkillBonus = coreUpgradeManager.getProductionMultiplier('prestige_producers', 'postDoc');
            multiplier = decimalUtility.multiply(multiplier, postDocSkillBonus);
            return multiplier;
        };

        coreUpgradeManager.registerEffectSource(
            'prestige', // Module ID
            'postDoc_prestige_producer_multiplier', // Unique source key for this effect
            postDocDef.effect.targetSystem, // 'prestige_producers'
            postDocDef.effect.targetId,   // 'ALL'
            postDocDef.effect.type,       // 'MULTIPLIER'
            postDocEffectValueProvider
        );
        loggingSystem.debug("PrestigeLogic", "Registered/Updated postDoc effect with CoreUpgradeManager.");
    }

    // Now, iterate through all prestige producers to set their actual output rates
    // This part handles 'license', 'master1', 'master2', 'phd' which produce studies resources.
    for (const producerId in prestigeData.producers) {
        const producerDef = prestigeData.producers[producerId];
        const ownedCount = getOwnedPrestigeProducerCount(producerId);

        // Production sources should be uniquely identified to avoid conflicts, e.g., 'prestige_license_to_student'
        const productionSourceKeyPrefix = `prestige_producer_${producerId}`;

        // If producer has no direct production or is not owned, ensure its production in CRM is 0
        if (!producerDef.production || decimalUtility.eq(ownedCount, 0)) {
            if (producerDef.production) {
                producerDef.production.forEach(prod => {
                    const resourceId = prod.resourceId; // e.g., 'studies'
                    const producerIdInStudies = prod.producerId; // e.g., 'student'
                    const sourceKey = `${productionSourceKeyPrefix}_to_${producerIdInStudies}`;
                    // Important: Resource ID for studies module is generally 'studyPoints' or 'knowledge'.
                    // The production array refers to studies `producerId`s, but these producers
                    // generate `studyPoints` or `knowledge` resources. Need to correctly map.
                    // Assuming prod.resourceId refers to the *output resource* (e.g., 'studyPoints' or 'knowledge')
                    // and not the studies module ID itself.
                    // This requires a mapping from producerId in studies to its output resource.
                    // For now, assuming `prod.resourceId` is the actual resource generated.

                    // Check if the output resource is valid (e.g., 'studyPoints' or 'knowledge')
                    let actualOutputResourceId;
                    if (['student', 'classroom', 'kindergarten', 'elementarySchool', 'middleSchool', 'highSchool', 'university'].includes(prod.producerId)) {
                        actualOutputResourceId = 'studyPoints'; // These studies producers output study points
                    } else if (prod.producerId === 'professor') {
                        actualOutputResourceId = 'knowledge'; // Professor outputs knowledge
                    } else {
                        loggingSystem.warn("PrestigeLogic", `Unknown producerId in prestige production array: ${prod.producerId}. Cannot determine output resource.`);
                        actualOutputResourceId = null;
                    }

                    if (actualOutputResourceId) {
                         coreResourceManager.setProductionPerSecond(actualOutputResourceId, sourceKey, decimalUtility.new(0));
                    }
                });
            }
            continue;
        }

        // Apply skill multipliers and achievement multipliers to this producer's effectiveness
        let effectiveOwned = ownedCount;
        const producerSkillMultiplier = coreUpgradeManager.getProductionMultiplier('prestige_producers', producerId);
        // Assuming achievements can target prestige_producers too, using a specific key for them
        const producerAchMultiplier = coreUpgradeManager.getAggregatedModifiers('achievements', producerId, 'MULTIPLIER'); 

        effectiveOwned = decimalUtility.multiply(effectiveOwned, producerSkillMultiplier);
        effectiveOwned = decimalUtility.multiply(effectiveOwned, producerAchMultiplier);

        // Apply the Post-Doc global multiplier if this is not the Post-Doc itself
        // The postDoc multiplier has targetSystem: 'prestige_producers' and targetId: 'ALL'
        if (producerId !== 'postDoc') {
            const postDocMultiplier = coreUpgradeManager.getProductionMultiplier('prestige_producers', 'ALL'); // Get aggregated multiplier for ALL prestige producers
            effectiveOwned = decimalUtility.multiply(effectiveOwned, postDocMultiplier);
        }

        // Now, apply the effectiveOwned count to its specific productions
        producerDef.production.forEach(prod => {
            const productionRate = decimalUtility.multiply(decimalUtility.new(prod.base), effectiveOwned);
            const sourceKey = `${productionSourceKeyPrefix}_to_${prod.producerId}`;
            
            // Determine the actual resource ID for the production
            let actualOutputResourceId;
            if (['student', 'classroom', 'kindergarten', 'elementarySchool', 'middleSchool', 'highSchool', 'university'].includes(prod.producerId)) {
                actualOutputResourceId = 'studyPoints';
            } else if (prod.producerId === 'professor') {
                actualOutputResourceId = 'knowledge';
            } else {
                loggingSystem.warn("PrestigeLogic", `Unknown studies producerId in prestige production: ${prod.producerId}. Skipping production setting.`);
                return; // Skip this production if the output resource cannot be determined
            }

            coreResourceManager.setProductionPerSecond(
                actualOutputResourceId, 
                sourceKey, 
                productionRate
            );
            loggingSystem.debug("PrestigeLogic", `Prestige producer ${producerId} is setting production for ${actualOutputResourceId} (via ${prod.producerId}) at rate: ${productionRate.toString()}`);
        });
    }
};


export const canPrestige = () => {
    return coreSystemsRef.coreGameStateManager.getGlobalFlag('prestigeUnlocked', false);
};

export const calculatePrestigeGain = () => {
    if (!canPrestige()) return decimalUtility.new(0);

    const { coreUpgradeManager, coreGameStateManager, coreResourceManager, decimalUtility } = coreSystemsRef;
    const prestigeCount = decimalUtility.new(moduleState.totalPrestigeCount || '0');
    const totalKnowledge = coreResourceManager.getAmount('knowledge'); // Get current knowledge

    // New formula: 1 + (Total prestige count / 6) + (Total knowledge / 10 000)
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
    const { coreUpgradeManager, coreResourceManager, decimalUtility } = coreSystemsRef; // Added coreResourceManager
    const prestigeCount = decimalUtility.new(moduleState.totalPrestigeCount || '0');
    const images = coreResourceManager.getAmount('images') || decimalUtility.new(0);

    const prestigeBonus = decimalUtility.divide(prestigeCount, 6);
    const imageBonus = decimalUtility.divide(images, '1e13'); // Keep original image bonus

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

    // Calculate individual components for display
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
                    
                    coreGameStateManager.setModuleState('prestige', prestigeModuleState);
                    Object.assign(moduleState, prestigeModuleState);
                    
                    coreGameStateManager.setGlobalFlag('hasPrestigedOnce', true);
                    
                    coreResourceManager.addAmount('prestigePoints', ppGains);
                    
                    coreResourceManager.setResourceVisibility('prestigePoints', true);
                    coreResourceManager.setResourceVisibility('prestigeCount', true);
                    
                    // Re-register effects after prestige reset to ensure they reflect the new state
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
