// js/modules/core_gameplay_module/core_gameplay_data.js (v2 - Refactored)
// Now defines the studyPoints resource it introduces.

import { RESOURCES } from '../../core/constants.js';

export const staticModuleData = {
    resources: {
        [RESOURCES.STUDY_POINTS]: { 
            id: RESOURCES.STUDY_POINTS, 
            name: "Study Points", 
            initialAmount: "0", 
            isUnlocked: true, 
            showInUI: true, 
            hasProductionRate: true 
        }
    },
    resourceId: RESOURCES.STUDY_POINTS,
    clickAmount: 1, // Base amount gained per click
    ui: {
        mainButtonText: "Study Diligently",
        mainButtonTooltip: (amount) => `Gain ${amount} Study Point${amount === 1 ? "" : "s"}.`
    }
};
