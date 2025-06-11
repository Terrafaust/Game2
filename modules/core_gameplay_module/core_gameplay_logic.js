// modules/core_gameplay_module/core_gameplay_logic.js (v4.0 - Refactored)
// Now delegates all calculation logic to the new productionManager.

import { moduleState } from './core_gameplay_state.js';
// FIXED: Corrected the import path to include the 'js' directory.
import { RESOURCES, MODULES } from '../../js/core/constants.js';

let coreSystemsRef = null; 

export const moduleLogic = {
    initialize(coreSystems) { 
        coreSystemsRef = coreSystems;
        coreSystemsRef.loggingSystem.info("CoreGameplayLogic", "Logic initialized (v4.0).");
    },

    // REFACTORED: This is now a simple wrapper around the productionManager
    calculateManualStudyGain() {
        if (!coreSystemsRef) return { [RESOURCES.STUDY_POINTS]: new Decimal(0), [RESOURCES.KNOWLEDGE]: new Decimal(0) };
        return coreSystemsRef.productionManager.getManualClickGain();
    },

    performManualStudy() {
        if (!coreSystemsRef) {
            console.error("CoreGameplayLogic: Core systems not initialized for performManualStudy.");
            return;
        }
        const { coreResourceManager, decimalUtility, loggingSystem, coreGameStateManager } = coreSystemsRef;
        
        const gains = this.calculateManualStudyGain();
        const studyPointsGain = gains[RESOURCES.STUDY_POINTS];
        const knowledgeGain = gains[RESOURCES.KNOWLEDGE];
        
        if (decimalUtility.gt(studyPointsGain, 0)) {
            coreResourceManager.addAmount(RESOURCES.STUDY_POINTS, studyPointsGain);
        }
        if (decimalUtility.gt(knowledgeGain, 0)) {
            coreResourceManager.addAmount(RESOURCES.KNOWLEDGE, knowledgeGain);
        }

        moduleState.totalManualClicks++;
        coreGameStateManager.setModuleState(MODULES.CORE_GAMEPLAY, { ...moduleState });

        loggingSystem.debug("CoreGameplayLogic", `Manually studied. Gained: ${studyPointsGain} SP, ${knowledgeGain} Knowledge. Total clicks: ${moduleState.totalManualClicks}`);
        
        return {
            amountGained: studyPointsGain,
            newTotal: coreResourceManager.getAmount(RESOURCES.STUDY_POINTS)
        };
    },

    getTotalClicks() {
        return moduleState.totalManualClicks || 0;
    }
};
