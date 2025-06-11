// /game/modules/prestige_module/prestige_logic.js (v10.0 - Complete & Refactored)
// Adopts standard module pattern, uses constants, and all functions are fully implemented.

import { prestigeData } from './prestige_data.js';
import { moduleState, getInitialState } from './prestige_state.js';
import { RESOURCES, UPGRADE_TARGETS, GLOBAL_FLAGS, MODULES } from '../../js/core/constants.js';

let coreSystemsRef;

export const moduleLogic = {
    initialize(systems) {
        coreSystemsRef = systems;
        coreSystemsRef.loggingSystem.info("PrestigeLogic", "Logic initialized (v10.0).");
    },
    
    processPrestigeTick(deltaTimeSeconds) {
        if (moduleState.currentPrestigeRunTime !== undefined) {
            moduleState.currentPrestigeRunTime += deltaTimeSeconds;
        }
        this.processPassiveProducerGeneration(deltaTimeSeconds);
    },

    getOwnedPrestigeProducerCount(producerId) {
        return coreSystemsRef.decimalUtility.new(moduleState.ownedProducers[producerId] || '0');
    },

    getTotalPrestigeCount() {
        return coreSystemsRef.decimalUtility.new(moduleState.totalPrestigeCount || '0');
    },

    getTotalPPEarned() {
        return coreSystemsRef.decimalUtility.new(moduleState.totalPrestigePointsEverEarned || '0');
    },

    getPostDocMultiplier() {
        const { decimalUtility } = coreSystemsRef;
        const owned = this.getOwnedPrestigeProducerCount('postDoc');
        return decimalUtility.eq(owned, 0) ? decimalUtility.ONE : decimalUtility.power('1.08', owned);
    },

    calculatePrestigeProducerCost(producerId, quantity = 1) {
        const { decimalUtility, coreUpgradeManager } = coreSystemsRef;
        const producerDef = prestigeData.producers[producerId];
        if (!producerDef) return decimalUtility.new(Infinity);

        const n = decimalUtility.new(quantity);
        if (decimalUtility.eq(n, 0)) return decimalUtility.ZERO;

        const baseCost = decimalUtility.new(producerDef.baseCost);
        const growth = decimalUtility.new(producerDef.costGrowthFactor);
        const owned = this.getOwnedPrestigeProducerCount(producerId);

        const costReductionMultiplier = coreUpgradeManager.getCostReductionMultiplier(UPGRADE_TARGETS.PRESTIGE_PRODUCERS, producerId);
        const effectiveBaseCost = decimalUtility.multiply(baseCost, costReductionMultiplier);

        return decimalUtility.getGeometricSeriesCost(effectiveBaseCost, growth, owned, n);
    },

    calculateMaxBuyablePrestigeProducer(producerId) {
        const { coreResourceManager, decimalUtility, coreUpgradeManager } = coreSystemsRef;
        const producerDef = prestigeData.producers[producerId];
        if (!producerDef) return decimalUtility.ZERO;
        
        const availableCurrency = coreResourceManager.getAmount(producerDef.costResource);
        const owned = this.getOwnedPrestigeProducerCount(producerId);
        const baseCost = decimalUtility.new(producerDef.baseCost);
        const growth = decimalUtility.new(producerDef.costGrowthFactor);
        
        const costReductionMultiplier = coreUpgradeManager.getCostReductionMultiplier(UPGRADE_TARGETS.PRESTIGE_PRODUCERS, producerId);
        const effectiveBaseCost = decimalUtility.multiply(baseCost, costReductionMultiplier);
        
        return decimalUtility.getMaxBuyableGeometric(availableCurrency, effectiveBaseCost, growth, owned);
    },

    purchasePrestigeProducer(producerId) {
        const { coreUIManager, coreResourceManager, coreGameStateManager, decimalUtility, buyMultiplierManager } = coreSystemsRef;
        const producerDef = prestigeData.producers[producerId];
        if (!producerDef) return false;

        const multiplier = buyMultiplierManager.getMultiplier();
        let quantityToBuy = (multiplier === -1) ? this.calculateMaxBuyablePrestigeProducer(producerId) : decimalUtility.new(multiplier);

        if (decimalUtility.lte(quantityToBuy, 0)) {
            coreUIManager.showNotification('ui.notifications.cannot_afford', 'warning', 3000, { replacements: { itemName: producerDef.name + 's' } });
            return false;
        }

        const totalCost = this.calculatePrestigeProducerCost(producerId, quantityToBuy);

        if (coreResourceManager.canAfford(producerDef.costResource, totalCost)) {
            coreResourceManager.spendAmount(producerDef.costResource, totalCost);
            
            moduleState.ownedProducers[producerId] = decimalUtility.add(moduleState.ownedProducers[producerId] || 0, quantityToBuy).toString();
            coreGameStateManager.setModuleState(MODULES.PRESTIGE, { ...moduleState });
            
            this.updatePrestigeProducerEffects(); 
            coreUIManager.showNotification('ui.notifications.item_acquired', 'success', 2000, { replacements: { quantity: decimalUtility.format(quantityToBuy, 0), itemName: producerDef.name }});
            return true;
        } else {
            coreUIManager.showNotification('ui.notifications.not_enough_resources', 'error');
            return false;
        }
    },

    processPassiveProducerGeneration(deltaTimeSeconds) {
        const { decimalUtility, moduleLoader, coreGameStateManager, coreUpgradeManager } = coreSystemsRef;
        
        const studiesModule = moduleLoader.getModule(MODULES.STUDIES);
        if (!studiesModule || !studiesModule.logic.addProducers) return; 

        let producersToAdd = {};
        const postDocMultiplier = this.getPostDocMultiplier();

        for (const producerId in prestigeData.producers) {
            if (producerId === 'postDoc' || !prestigeData.producers[producerId].passiveProduction) continue;

            const producerDef = prestigeData.producers[producerId];
            const ownedCount = this.getOwnedPrestigeProducerCount(producerId);
            if (decimalUtility.eq(ownedCount, 0)) continue;

            producerDef.passiveProduction.forEach(target => {
                let totalRate = decimalUtility.multiply(target.baseRate, ownedCount);
                totalRate = decimalUtility.multiply(totalRate, postDocMultiplier);
                totalRate = decimalUtility.multiply(totalRate, coreUpgradeManager.getProductionMultiplier(UPGRADE_TARGETS.PRESTIGE_PRODUCERS, producerId));
                totalRate = decimalUtility.multiply(totalRate, coreUpgradeManager.getProductionMultiplier(UPGRADE_TARGETS.GLOBAL_PRODUCTION, 'all'));

                const generatedThisTick = decimalUtility.multiply(totalRate, deltaTimeSeconds);
                moduleState.passiveProductionProgress[target.producerId] = decimalUtility.add(moduleState.passiveProductionProgress[target.producerId] || '0', generatedThisTick).toString();

                if (decimalUtility.gte(moduleState.passiveProductionProgress[target.producerId], 1)) {
                    const wholeProducers = decimalUtility.floor(moduleState.passiveProductionProgress[target.producerId]);
                    producersToAdd[target.producerId] = decimalUtility.add(producersToAdd[target.producerId] || 0, wholeProducers);
                    moduleState.passiveProductionProgress[target.producerId] = decimalUtility.subtract(moduleState.passiveProductionProgress[target.producerId], wholeProducers).toString();
                }
            });
        }

        if (Object.keys(producersToAdd).length > 0) {
            studiesModule.logic.addProducers(producersToAdd);
        }
        
        coreGameStateManager.setModuleState(MODULES.PRESTIGE, { ...moduleState });
    },

    updatePrestigeProducerEffects() {
        const { coreUpgradeManager, decimalUtility } = coreSystemsRef;
        for (const producerId in prestigeData.producers) {
            const producerDef = prestigeData.producers[producerId];
            if (producerDef.effect && producerId !== 'postDoc') {
                const producerCount = this.getOwnedPrestigeProducerCount(producerId);
                const valueProvider = () => decimalUtility.add(1, decimalUtility.multiply(producerCount, producerDef.effect.valuePerLevel));
                coreUpgradeManager.registerEffectSource(MODULES.PRESTIGE, `${producerId}_effect`, producerDef.effect.targetSystem, producerDef.effect.targetId, producerDef.effect.type, valueProvider);
            }
        }
    },

    canPrestige() {
        const flagUnlocked = coreSystemsRef.coreGameStateManager.getGlobalFlag(GLOBAL_FLAGS.PRESTIGE_UNLOCKED, false);
        const hasEnoughImages = coreSystemsRef.coreResourceManager.canAfford(RESOURCES.IMAGES, 1000);
        return flagUnlocked && hasEnoughImages;
    },

    calculatePrestigeGain() {
        if (!this.canPrestige()) return coreSystemsRef.decimalUtility.ZERO;

        const { coreUpgradeManager, coreResourceManager, decimalUtility } = coreSystemsRef;
        const prestigeCount = this.getTotalPrestigeCount();
        const totalKnowledge = coreResourceManager.getAmount(RESOURCES.KNOWLEDGE);
        
        let totalGain = decimalUtility.new(1).add(decimalUtility.multiply(prestigeCount, totalKnowledge).div(6000));
        
        const ppGainBonus = coreUpgradeManager.getProductionMultiplier(UPGRADE_TARGETS.PRESTIGE_MECHANICS, 'ppGain');
        totalGain = decimalUtility.multiply(totalGain, ppGainBonus);

        const globalBonus = coreUpgradeManager.getProductionMultiplier(UPGRADE_TARGETS.GLOBAL_PRODUCTION, 'all');
        totalGain = decimalUtility.multiply(totalGain, globalBonus);

        return totalGain.floor();
    },
    
    getPrestigeBonusMultiplier(prestigeCountOverride = null) {
        const { coreUpgradeManager, coreResourceManager, decimalUtility } = coreSystemsRef;
        const prestigeCount = prestigeCountOverride !== null ? decimalUtility.new(prestigeCountOverride) : this.getTotalPrestigeCount();
        const images = coreResourceManager.getAmount(RESOURCES.IMAGES) || decimalUtility.ZERO;

        const prestigeBonus = decimalUtility.divide(prestigeCount, 6);
        const imageBonus = decimalUtility.divide(images, '1e13'); 
        const prestigeBonusBonus = coreUpgradeManager.getProductionMultiplier(UPGRADE_TARGETS.PRESTIGE_MECHANICS, 'prestigeBonus');

        let totalBonus = decimalUtility.add(1, decimalUtility.add(prestigeBonus, imageBonus));
        totalBonus = decimalUtility.multiply(totalBonus, prestigeBonusBonus);
        return totalBonus;
    },

    getPrestigeConfirmationDetails() {
        const { decimalUtility, moduleLoader, coreResourceManager, coreUpgradeManager } = coreSystemsRef;

        if (!this.canPrestige()) {
            return { canPrestige: false, reason: "Requires 1,000 Images to Prestige." };
        }
        
        const ppGains = this.calculatePrestigeGain();
        if (decimalUtility.lte(ppGains, 0)) {
            return { canPrestige: false, reason: "You would not gain any Prestige Points." };
        }
        
        const prestigeCount = this.getTotalPrestigeCount();
        const totalKnowledge = coreResourceManager.getAmount(RESOURCES.KNOWLEDGE);
        const prestigeFactor = decimalUtility.divide(prestigeCount, 6);
        const knowledgeFactor = decimalUtility.divide(totalKnowledge, 1000);
        const ppGainBonus = coreUpgradeManager.getProductionMultiplier(UPGRADE_TARGETS.PRESTIGE_MECHANICS, 'ppGain');
        const globalBonus = coreUpgradeManager.getProductionMultiplier(UPGRADE_TARGETS.GLOBAL_PRODUCTION, 'all');
        const ppGainsExplanation = `(1 + P.Count/6 * Know./1k) * Bonuses = (1 + ${decimalUtility.format(prestigeFactor, 2)} * ${decimalUtility.format(knowledgeFactor,2)}) * ${decimalUtility.format(ppGainBonus, 2)}x * ${decimalUtility.format(globalBonus, 2)}x`;

        const currentBonus = this.getPrestigeBonusMultiplier();
        const nextPrestigeNumber = prestigeCount.add(1);
        const nextBonus = this.getPrestigeBonusMultiplier(nextPrestigeNumber);
        const bonusExplanation = `(1 + Prestige Bonus + Image Bonus) * Multipliers`;

        const skillsLogic = moduleLoader.getModule(MODULES.SKILLS)?.logic;
        let retainedKnowledge = decimalUtility.ZERO;
        let retainedSsp = decimalUtility.ZERO;
        let startingProducers = {};

        if (skillsLogic) {
            retainedKnowledge = decimalUtility.multiply(coreResourceManager.getAmount(RESOURCES.KNOWLEDGE), skillsLogic.getKnowledgeRetentionPercentage());
            retainedSsp = decimalUtility.multiply(coreResourceManager.getAmount(RESOURCES.STUDY_SKILL_POINTS), skillsLogic.getSspRetentionPercentage());
            startingProducers = skillsLogic.getStartingProducers();
        }

        return {
            canPrestige: true,
            ppGains,
            ppGainsExplanation,
            currentBonus,
            nextBonus,
            bonusExplanation,
            retainedKnowledge,
            retainedSsp,
            startingProducers,
            nextPrestigeNumber
        };
    },

    executePrestigeReset(ppGains) {
        const { coreResourceManager, moduleLoader, coreGameStateManager, decimalUtility, coreUIManager } = coreSystemsRef;
        
        const skillsLogic = moduleLoader.getModule(MODULES.SKILLS)?.logic;
        let retainedKnowledge = decimalUtility.ZERO;
        let retainedSsp = decimalUtility.ZERO;
        let startingProducers = {};

        if (skillsLogic) {
            retainedKnowledge = decimalUtility.multiply(coreResourceManager.getAmount(RESOURCES.KNOWLEDGE), skillsLogic.getKnowledgeRetentionPercentage());
            retainedSsp = decimalUtility.multiply(coreResourceManager.getAmount(RESOURCES.STUDY_SKILL_POINTS), skillsLogic.getSspRetentionPercentage());
            startingProducers = skillsLogic.getStartingProducers();
        }

        const newPrestigeCount = decimalUtility.add(this.getTotalPrestigeCount(), 1);
        const prestigeRecord = { count: newPrestigeCount.toString(), time: moduleState.currentPrestigeRunTime || 0, ppGained: ppGains.toString() };
        
        moduleState.lastTenPrestiges = [prestigeRecord, ...(moduleState.lastTenPrestiges || [])].slice(0, 10);
        moduleState.totalPrestigeCount = newPrestigeCount.toString();
        moduleState.totalPrestigePointsEverEarned = decimalUtility.add(this.getTotalPPEarned(), ppGains).toString();
        moduleState.passiveProductionProgress = getInitialState().passiveProductionProgress;
        moduleState.currentPrestigeRunTime = 0;
        
        coreResourceManager.performPrestigeReset();
        moduleLoader.broadcastLifecycleEvent('onPrestigeReset');
        
        coreGameStateManager.setModuleState(MODULES.PRESTIGE, { ...moduleState });
        coreGameStateManager.setGlobalFlag(GLOBAL_FLAGS.HAS_PRESTIGED_ONCE, true);
        
        coreResourceManager.addAmount(RESOURCES.PRESTIGE_POINTS, ppGains);
        coreResourceManager.setAmount(RESOURCES.PRESTIGE_COUNT, newPrestigeCount);
        if (decimalUtility.gt(retainedKnowledge, 0)) coreResourceManager.addAmount(RESOURCES.KNOWLEDGE, retainedKnowledge);
        if (decimalUtility.gt(retainedSsp, 0)) coreResourceManager.addAmount(RESOURCES.STUDY_SKILL_POINTS, retainedSsp);
        if (Object.keys(startingProducers).length > 0) moduleLoader.getModule(MODULES.STUDIES)?.logic.addProducers(startingProducers);

        coreResourceManager.setResourceVisibility(RESOURCES.PRESTIGE_POINTS, true);
        coreResourceManager.setResourceVisibility(RESOURCES.PRESTIGE_COUNT, true);
        this.updatePrestigeProducerEffects();
        coreUIManager.fullUIRefresh();
        coreUIManager.showNotification('ui.notifications.prestiged', "success", 5000);
    }
};
