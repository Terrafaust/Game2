// js/modules/core_gameplay_module/core_gameplay_data.js (v3 - Translation Keys)
// Uses translation keys instead of hardcoded English strings.

import { RESOURCES } from '../../js/core/constants.js';

export const staticModuleData = {
    resources: {
        [RESOURCES.STUDY_POINTS]: { 
            id: RESOURCES.STUDY_POINTS, 
            // MODIFICATION: Changed "Study Points" to its translation key.
            name: "resources.studyPoints.name", 
            initialAmount: "0", 
            isUnlocked: true, 
            showInUI: true, 
            hasProductionRate: true 
        }
    },
    resourceId: RESOURCES.STUDY_POINTS,
    clickAmount: 1,
    // The ui object is no longer needed here as the UI module will get keys directly
    // from the translation manager.
};
