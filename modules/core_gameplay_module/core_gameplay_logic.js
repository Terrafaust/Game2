// modules/core_gameplay_module/core_gameplay_logic.js (v2.1 - Achievement Support)

/**
 * @file core_gameplay_logic.js
 * @description Contains the business logic for the Core Gameplay module.
 * v2.1: getTotalClicks exposed for achievements.
 */

import { staticModuleData } from './core_gameplay_data.js';
import { moduleState } from './core_gameplay_state.js';

let coreSystemsRef = null; 

export const moduleLogic = {
    initialize(coreSystems, initialStateRef) { 
        coreSystemsRef = coreSystems;
        coreSystemsRef.loggingSystem.info("CoreGameplayLogic", "Logic initialized (v2.1).");
    },

    performManualStudy() {
        if (!coreSystemsRef) {
            console.error("CoreGameplayLogic: Core systems not initialized for performManualStudy."); // Use console.error if loggingSystem itself is an issue
            return;
        }
        const { coreResourceManager, decimalUtility, loggingSystem, coreGameStateManager } = coreSystemsRef;
        
        const baseAmountGained = decimalUtility.new(staticModuleData.clickAmount);
        const currentSps = coreResourceManager.getTotalProductionRate('studyPoints');
        const bonusPercentage = decimalUtility.new(0.10); 
        const spsBonus = decimalUtility.multiply(currentSps, bonusPercentage);
        const totalAmountGained = decimalUtility.add(baseAmountGained, spsBonus);
        
        coreResourceManager.addAmount(staticModuleData.resourceId, totalAmountGained);
        moduleState.totalManualClicks++;
        coreGameStateManager.setModuleState('core_gameplay', { ...moduleState });

        loggingSystem.debug("CoreGameplayLogic", `Manually studied. Base: ${baseAmountGained}, SPS Bonus: ${spsBonus}. Total Gained: ${totalAmountGained} ${staticModuleData.resourceId}. Total clicks: ${moduleState.totalManualClicks}`);
        
        return {
            amountGained: totalAmountGained, 
            newTotal: coreResourceManager.getAmount(staticModuleData.resourceId)
        };
    },

    // This method is now crucial for achievements
    getTotalClicks() {
        return moduleState.totalManualClicks || 0; // Ensure it returns 0 if not yet set
    }
};
