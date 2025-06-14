// js/modules/core_gameplay_module/core_gameplay_data.js (v3.1 - Final Translation Key Fix)
// This version ensures that all hardcoded text is replaced with a proper translation key.

import { RESOURCES } from '../../js/core/constants.js';

export const staticModuleData = {
    resources: {
        [RESOURCES.STUDY_POINTS]: { 
            id: RESOURCES.STUDY_POINTS, 
            // FINAL FIX: The name must be the translation key for the UI manager to look up.
            name: "resources.studyPoints.name", 
            initialAmount: "0", 
            isUnlocked: true, 
            showInUI: true, 
            hasProductionRate: true 
        }
    },
    resourceId: RESOURCES.STUDY_POINTS,
    clickAmount: 1
};
