// /game/modules/prestige_module/prestige_logic.js (v7.6 - Structural Integrity Fix)
import { prestigeData } from './prestige_data.js';
import { moduleState, getInitialState } from './prestige_state.js';

let coreSystemsRef;

export const initialize = (systems) => {
    coreSystemsRef = systems;
    coreSystemsRef.loggingSystem.info("PrestigeLogic", "Logic initialized (v7.6).");
};

export const processPrestigeTick = (deltaTimeSeconds) => {
    if (!coreSystemsRef) return;
    if (moduleState.currentPrestigeRunTime !== undefined) {
        moduleState.currentPrestigeRunTime += deltaTimeSeconds;
    } else if (coreSystemsRef.coreGameStateManager.getModuleState('prestige')) {
        moduleState.currentPrestigeRunTime = 0;
    }
    processPassiveProducerGeneration(deltaTimeSeconds);
};

export const getOwnedPrestigeProducerCount = (producerId) => {
    if (!coreSystemsRef) return new Decimal(0);
    return coreSystemsRef.decimalUtility.new(moduleState.ownedProducers[producerId] || '0');
};

export const getTotalPrestigeCount = () => {
    if (!coreSystemsRef) return new Decimal(0);
    return coreSystemsRef.decimalUtility.new(moduleState.totalPrestigeCount || '0');
};

export const getTotalPPEarned = () => {
    if (!coreSystemsRef) return new Decimal(0);
    return coreSystemsRef.decimalUtility.new(moduleState.totalPrestigePointsEverEarned || '0');
};

export const getPostDocMultiplier = () => {
    if (!coreSystemsRef) return coreSystemsRef.decimalUtility.new(1);
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
    if (!coreSystemsRef) return false;
    const flagUnlocked = coreSystemsRef.coreGameStateManager.getGlobalFlag('prestigeUnlocked', false);
    const hasEnoughImages = coreSystemsRef.coreResourceManager.canAfford('images', 1000);
    return flagUnlocked && hasEnoughImages;
};

export const calculatePrestigeGain = () => {
    const { coreUpgradeManager, coreResourceManager, decimalUtility, coreGameStateManager } = coreSystemsRef;
    
    const result = {
        points: decimalUtility.new(0),
        explanation: "Not unlocked."
    };

    if (!coreGameStateManager.getGlobalFlag('prestigeUnlocked', false)) {
        return result;
    }
    
    const prestigeCount = decimalUtility.new(moduleState.totalPrestigeCount || '0');
    const totalKnowledge = coreResourceManager.getAmount('knowledge');

    const baseGain = decimalUtility.new(1);
    const prestigeFactor = decimalUtility.divide(prestigeCount, 6);
    const knowledgeFactor = decimalUtility.divide(totalKnowledge, 1000);
    const formulaGain = decimalUtility.multiply(prestigeFactor, knowledgeFactor);
    let totalGain = decimalUtility.add(baseGain, formulaGain);

    let explanation = `(Base: 1 + (Prestige Count: ${decimalUtility.format(prestigeCount, 0)} / 6) * (Knowledge: ${decimalUtility.format(totalKnowledge, 2)} / 1000))`;

    const ppGainBonus = coreUpgradeManager.getProductionMultiplier('prestige_mechanics', 'ppGain');
    if (decimalUtility.gt(ppGainBonus, 1)) {
        totalGain = decimalUtility.multiply(totalGain, ppGainBonus);
        explanation += ` * ${decimalUtility.format(ppGainBonus, 2)}x (Skill Bonus)`;
    }

    const globalBonus = coreUpgradeManager.getProductionMultiplier('global_production', 'all');
    if (decimalUtility.gt(globalBonus, 1)) {
        totalGain = decimalUtility.multiply(totalGain, globalBonus);
        explanation += ` * ${decimalUtility.format(globalBonus, 2)}x (Global Bonus)`;
    }
    
    result.points = totalGain.floor();
    result.explanation = explanation;

    return result;
};

export const getPrestigeBonusMultiplier = (prestigeCountOverride = null) => {
    const { coreUpgradeManager, coreResourceManager, decimalUtility } = coreSystemsRef;
    
    const prestigeCount = prestigeCountOverride !== null ? decimalUtility.new(prestigeCountOverride) : getTotalPrestigeCount();
    const images = coreResourceManager.getAmount('images') || decimalUtility.new(0);

    const prestigeBonus = decimalUtility.divide(prestigeCount, 6);
    const imageBonus = decimalUtility.divide(images, '1e13');
    
    let totalBonus = decimalUtility.add(1, decimalUtility.add(prestigeBonus, imageBonus));
    let explanation = `(Base: 1 + Prestige Bonus: ${decimalUtility.format(prestigeBonus, 2)} + Image Bonus: ${decimalUtility.format(imageBonus, 2)})`;

    const prestigeBonusBonus = coreUpgradeManager.getProductionMultiplier('prestige_mechanics', 'prestigeBonus');
    if (decimalUtility.gt(prestigeBonusBonus, 1)) {
        totalBonus = decimalUtility.multiply(totalBonus, prestigeBonusBonus);
        explanation += ` * ${decimalUtility.format(prestigeBonusBonus, 2)}x (Skill Bonus)`;
    }
    
    return {
        multiplier: totalBonus,
        explanation: explanation
    };
};

export const performPrestige = () => {
    const { coreUIManager, coreResourceManager, moduleLoader, coreGameStateManager, decimalUtility } = coreSystemsRef;

    if (!canPrestige()) {
        coreUIManager.showNotification("Requires 1,000 Images to Prestige.", "error");
        return;
    }
    const gainInfo = calculatePrestigeGain();
    if (decimalUtility.lte(gainInfo.points, 0)) {
        coreUIManager.showNotification("You would not gain any Prestige Points.", "warning");
        return;
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
    
    const getOrdinal = (n) => {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };
    const prestigeOrdinal = getOrdinal(nextPrestigeNumber.toNumber());

    const currentBonusInfo = getPrestigeBonusMultiplier();
    const nextBonusInfo = getPrestigeBonusMultiplier(nextPrestigeNumber);

    let gainsMessage = `
        <p>You will gain:</p>
        <p class="pl-4"><strong>${decimalUtility.format(gainInfo.points, 2, 0)}</strong> Prestige points</p>
        <p class="pl-4 text-xs text-gray-400">${gainInfo.explanation}</p>
        <p class="mt-2">All production boosts:</p>
        <p class="pl-4"><strong>${decimalUtility.format(currentBonusInfo.multiplier, 2)}x &rarr; ${decimalUtility.format(nextBonusInfo.multiplier, 2)}x</strong></p>
        <p class="pl-4 text-xs text-gray-400">${nextBonusInfo.explanation}</p>
    `;

    if (currentPrestigeCount.eq(0)) {
        gainsMessage += `<p class="mt-2 pl-4"><strong class="text-green-300">Unlock Prestige Skills</strong></p>`;
    }

    let keptResourcesMessage = '';
    if (decimalUtility.gt(retainedKnowledge, 0)) keptResourcesMessage += `<li><span class="font-bold text-yellow-300">${decimalUtility.format(retainedKnowledge, 2)}</span> Knowledge</li>`;
    if (decimalUtility.gt(retainedSsp, 0)) keptResourcesMessage += `<li><span class="font-bold text-yellow-300">${decimalUtility.format(retainedSsp, 0)}</span> Study Skill Points</li>`;
    if (Object.keys(startingProducers).length > 0) {
        for(const prodId in startingProducers) {
             keptResourcesMessage += `<li><span class="font-bold text-yellow-300">${decimalUtility.format(startingProducers[prodId], 0)}</span> starting ${prodId}s</li>`;
        }
    }

    const confirmationMessage = `
        <div class="space-y-4 text-left text-textPrimary">
            <p>Are you sure you want to proceed with your ${prestigeOrdinal} prestige?</p>
            <div class="p-3 bg-surface-dark rounded-lg border border-gray-600">
                ${gainsMessage}
            </div>
            ${keptResourcesMessage ? `
            <div class="p-3 bg-surface-dark rounded-lg border border-yellow-700">
                <p class="font-semibold text-yellow-300">You will keep (from Prestige Skills):</p>
                <ul class="list-disc list-inside text-sm mt-1 text-textSecondary">${keptResourcesMessage}</ul>
            </div>` : ''}
            <div class="p-3 bg-surface-dark rounded-lg border border-red-700">
                <p class="font-semibold text-red-300">The following will be reset:</p>
                <ul class="list-disc list-inside text-sm mt-1 text-textSecondary">
                    <li>Study Points, Knowledge, and Images</li>
                    <li>All Study Producers (Students, Classrooms, etc.)</li>
                    <li>Market Item costs and Automator Progress</li>
                    <li>Regular Skill levels and their SSP cost</li>
                </ul>
            </div>
             <p class="text-xs text-gray-400">Achievements, Unlocked Tabs, Prestige producers, Automator Levels, and Prestige Skills are kept.</p>
        </div>
    `;

    coreUIManager.showModal("Confirm Prestige", confirmationMessage, [
            {
                label: `Prestige for ${decimalUtility.format(gainInfo.points, 2, 0)} PP`,
                className: "bg-green-600 hover:bg-green-700",
                callback: () => {
                    const newPrestigeCount = decimalUtility.add(moduleState.totalPrestigeCount || 0, 1);
                    const prestigeRecord = { count: newPrestigeCount.toString(), time: moduleState.currentPrestigeRunTime || 0, ppGained: gainInfo.points.toString() };
                    const newHistory = [prestigeRecord, ...(moduleState.lastTenPrestiges || [])].slice(0, 10);
                    
                    coreResourceManager.performPrestigeReset();
                    moduleLoader.broadcastLifecycleEvent('onPrestigeReset');
                    
                    const prestigeModuleState = coreGameStateManager.getModuleState('prestige') || getInitialState();
                    prestigeModuleState.totalPrestigeCount = newPrestigeCount.toString();
                    prestigeModuleState.totalPrestigePointsEverEarned = decimalUtility.add(prestigeModuleState.totalPrestigePointsEverEarned || 0, gainInfo.points).toString();
                    prestigeModuleState.passiveProductionProgress = getInitialState().passiveProductionProgress;
                    prestigeModuleState.lastTenPrestiges = newHistory;
                    prestigeModuleState.currentPrestigeRunTime = 0;

                    coreGameStateManager.setModuleState('prestige', prestigeModuleState);
                    Object.assign(moduleState, prestigeModuleState);
                    coreGameStateManager.setGlobalFlag('hasPrestigedOnce', true);
                    coreResourceManager.addAmount('prestigePoints', gainInfo.points);
                    coreResourceManager.setAmount('prestigeCount', newPrestigeCount);
                    
                    if (decimalUtility.gt(retainedKnowledge, 0)) coreResourceManager.addAmount('knowledge', retainedKnowledge);
                    if (decimalUtility.gt(retainedSsp, 0)) coreResourceManager.addAmount('studySkillPoints', retainedSsp);
                    if (Object.keys(startingProducers).length > 0) moduleLoader.getModule('studies')?.logic.addProducers(startingProducers);

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
