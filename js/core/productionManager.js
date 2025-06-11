/**
 * @file productionManager.js
 * @description New core system to centralize all resource production rate calculations.
 */

import { RESOURCES, UPGRADE_TARGETS } from './constants.js';

let coreSystemsRef = null;

export const productionManager = {
    initialize(coreSystems) {
        coreSystemsRef = coreSystems;
    },

    /**
     * Recalculates the total production rate for a given resource by querying all relevant modules.
     * @param {string} resourceId - The ID of the resource to recalculate (e.g., 'studyPoints').
     */
    recalculateTotalProduction(resourceId) {
        const { moduleLoader, coreUpgradeManager, decimalUtility, coreResourceManager } = coreSystemsRef;
        let newTotalRate = decimalUtility.new(0);

        // --- Study Points and Knowledge Production from Studies Module ---
        if (resourceId === RESOURCES.STUDY_POINTS || resourceId === RESOURCES.KNOWLEDGE) {
            const studiesModule = moduleLoader.getModule('studies');
            if (studiesModule && studiesModule.logic.getAllProducersData) {
                const producersData = studiesModule.logic.getAllProducersData();
                producersData.forEach(p => {
                    // Only add production for the resource we are currently calculating
                    if (p.resourceId === resourceId) {
                        const specificMultiplierTarget = p.resourceId === RESOURCES.KNOWLEDGE ? UPGRADE_TARGETS.STUDIES_PRODUCERS_KNOWLEDGE : UPGRADE_TARGETS.STUDIES_PRODUCERS;
                        const specificMultiplier = coreUpgradeManager.getProductionMultiplier(specificMultiplierTarget, p.id);
                        
                        const productionFromProducer = decimalUtility.multiply(p.baseProduction, p.ownedCount).multiply(specificMultiplier);
                        newTotalRate = decimalUtility.add(newTotalRate, productionFromProducer);
                    }
                });
            }
        }

        // --- Passive Producer Generation from Prestige Module ---
        // The prestige module adds producers directly, which then contribute to the studies calculation above.
        // So no direct calculation is needed here, but this is where it would go if it produced resources directly.

        // Apply global bonuses
        const globalResourceMultiplier = coreUpgradeManager.getProductionMultiplier(UPGRADE_TARGETS.GLOBAL_RESOURCE_PRODUCTION, resourceId);
        newTotalRate = decimalUtility.multiply(newTotalRate, globalResourceMultiplier);

        const globalAllMultiplier = coreUpgradeManager.getProductionMultiplier(UPGRADE_TARGETS.GLOBAL_PRODUCTION, 'all');
        newTotalRate = decimalUtility.multiply(newTotalRate, globalAllMultiplier);
        
        // Final step: Update the resource manager with the new total rate
        coreResourceManager.setTotalProductionRate(resourceId, newTotalRate);
    },

    /**
     * Calculates the resource gain from a single manual click.
     * @returns {object} An object containing gains for different resources.
     */
    getManualClickGain() {
        const { coreResourceManager, decimalUtility, coreUpgradeManager, moduleLoader } = coreSystemsRef;
        const coreGameplayData = coreSystemsRef.staticDataAggregator.getData('core_gameplay');

        // --- Calculate Study Point Gain ---
        const baseAmountGained = decimalUtility.new(coreGameplayData.clickAmount);
        const spsBonus = decimalUtility.multiply(coreResourceManager.getTotalProductionRate(RESOURCES.STUDY_POINTS), 0.10);
        let studyPointsTotalGain = decimalUtility.add(baseAmountGained, spsBonus);
        
        // Apply multipliers
        const clickMultiplier = coreUpgradeManager.getProductionMultiplier(UPGRADE_TARGETS.CORE_GAMEPLAY_CLICK, RESOURCES.STUDY_POINTS);
        studyPointsTotalGain = decimalUtility.multiply(studyPointsTotalGain, clickMultiplier);
        const globalResourceMultiplier = coreUpgradeManager.getProductionMultiplier(UPGRADE_TARGETS.GLOBAL_RESOURCE_PRODUCTION, RESOURCES.STUDY_POINTS);
        studyPointsTotalGain = decimalUtility.multiply(studyPointsTotalGain, globalResourceMultiplier);
        const globalAllMultiplier = coreUpgradeManager.getProductionMultiplier(UPGRADE_TARGETS.GLOBAL_PRODUCTION, 'all');
        studyPointsTotalGain = decimalUtility.multiply(studyPointsTotalGain, globalAllMultiplier);

        // --- Calculate Knowledge Gain (from 'Final Frontier' skill) ---
        let knowledgeTotalGain = decimalUtility.new(0);
        const skillsModule = moduleLoader.getModule('skills');
        if (skillsModule) {
            const knowledgeGainPercent = skillsModule.logic.getManualKnowledgeGainPercent();
            if (decimalUtility.gt(knowledgeGainPercent, 0)) {
                const kps = coreResourceManager.getTotalProductionRate(RESOURCES.KNOWLEDGE);
                knowledgeTotalGain = decimalUtility.multiply(kps, knowledgeGainPercent);
            }
        }

        return {
            [RESOURCES.STUDY_POINTS]: studyPointsTotalGain,
            [RESOURCES.KNOWLEDGE]: knowledgeTotalGain
        };
    }
};
