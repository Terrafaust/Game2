// modules/core_gameplay_module/core_gameplay_logic.js (v3.0 - Final Frontier Skill)

/**
 * @file core_gameplay_logic.js
 * @description Contains the business logic for the Core Gameplay module.
 * v3.0: Implements the 'Final Frontier' skill effect, adding Knowledge gain to manual clicks.
 * v2.3: Manual click gain now benefits from all production multipliers.
 */

import { staticModuleData } from './core_gameplay_data.js';
import { moduleState } from './core_gameplay_state.js';

let coreSystemsRef = null; 

export const moduleLogic = {
    initialize(coreSystems, initialStateRef) { 
        coreSystemsRef = coreSystems;
        coreSystemsRef.loggingSystem.info("CoreGameplayLogic", "Logic initialized (v3.0).");
    },

    calculateManualStudyGain() {
        if (!coreSystemsRef) return { studyPointsGain: new (self.Decimal || Decimal)(0), knowledgeGain: new (self.Decimal || Decimal)(0) };
        const { coreResourceManager, coreUpgradeManager, decimalUtility, moduleLoader } = coreSystemsRef;
        
        // --- Calculate Study Point Gain ---
        let baseAmountGained = decimalUtility.new(staticModuleData.clickAmount);
        
        const currentSps = coreResourceManager.getTotalProductionRate('studyPoints');
        const bonusPercentage = decimalUtility.new(0.10); 
        const spsBonus = decimalUtility.multiply(currentSps, bonusPercentage);
        
        let studyPointsTotalGain = decimalUtility.add(baseAmountGained, spsBonus);

        const clickMultiplier = coreUpgradeManager.getProductionMultiplier('core_gameplay_click', 'studyPoints');
        studyPointsTotalGain = decimalUtility.multiply(studyPointsTotalGain, clickMultiplier);

        const globalResourceMultiplier = coreUpgradeManager.getProductionMultiplier('global_resource_production', 'studyPoints');
        studyPointsTotalGain = decimalUtility.multiply(studyPointsTotalGain, globalResourceMultiplier);

        const globalAllMultiplier = coreUpgradeManager.getProductionMultiplier('global_production', 'all');
        studyPointsTotalGain = decimalUtility.multiply(studyPointsTotalGain, globalAllMultiplier);

        // --- MODIFICATION: Calculate Knowledge Gain from 'Final Frontier' skill ---
        let knowledgeTotalGain = decimalUtility.new(0);
        const skillsModule = moduleLoader.getModule('skills');
        if (skillsModule) {
            const knowledgeGainPercent = skillsModule.logic.getManualKnowledgeGainPercent();
            if (decimalUtility.gt(knowledgeGainPercent, 0)) {
                const kps = coreResourceManager.getTotalProductionRate('knowledge');
                knowledgeTotalGain = decimalUtility.multiply(kps, knowledgeGainPercent);
            }
        }
        
        return {
            studyPointsGain: studyPointsTotalGain,
            knowledgeGain: knowledgeTotalGain
        };
    },

    performManualStudy() {
        if (!coreSystemsRef) {
            console.error("CoreGameplayLogic: Core systems not initialized for performManualStudy.");
            return;
        }
        const { coreResourceManager, decimalUtility, loggingSystem, coreGameStateManager } = coreSystemsRef;
        
        const { studyPointsGain, knowledgeGain } = this.calculateManualStudyGain();
        
        coreResourceManager.addAmount(staticModuleData.resourceId, studyPointsGain);
        
        // --- MODIFICATION: Add knowledge if there is any to add ---
        if (decimalUtility.gt(knowledgeGain, 0)) {
            coreResourceManager.addAmount('knowledge', knowledgeGain);
        }

        moduleState.totalManualClicks++;
        coreGameStateManager.setModuleState('core_gameplay', { ...moduleState });

        loggingSystem.debug("CoreGameplayLogic", `Manually studied. Gained: ${studyPointsGain} SP, ${knowledgeGain} Knowledge. Total clicks: ${moduleState.totalManualClicks}`);
        
        return {
            amountGained: studyPointsGain, // Keep original return structure for UI feedback
            newTotal: coreResourceManager.getAmount(staticModuleData.resourceId)
        };
    },

    getTotalClicks() {
        return moduleState.totalManualClicks || 0;
    }
};
