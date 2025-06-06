// modules/core_gameplay_module/core_gameplay_logic.js (v2.2 - Click Gain Calculation)

/**
 * @file core_gameplay_logic.js
 * @description Contains the business logic for the Core Gameplay module.
 * v2.2: Added calculateManualStudyGain to expose click value to UI.
 * v2.1: getTotalClicks exposed for achievements.
 */

import { staticModuleData } from './core_gameplay_data.js';
import { moduleState } from './core_gameplay_state.js';

let coreSystemsRef = null; 

export const moduleLogic = {
    initialize(coreSystems, initialStateRef) { 
        coreSystemsRef = coreSystems;
        coreSystemsRef.loggingSystem.info("CoreGameplayLogic", "Logic initialized (v2.2).");
    },

    /**
     * NEW: Calculates the amount of study points gained from a single manual click.
     * @returns {Decimal} The total amount that will be gained.
     */
    calculateManualStudyGain() {
        if (!coreSystemsRef) return new (self.Decimal || Decimal)(0);
        const { coreResourceManager, decimalUtility } = coreSystemsRef;
        
        const baseAmountGained = decimalUtility.new(staticModuleData.clickAmount);
        const currentSps = coreResourceManager.getTotalProductionRate('studyPoints');
        const bonusPercentage = decimalUtility.new(0.10); 
        const spsBonus = decimalUtility.multiply(currentSps, bonusPercentage);
        
        return decimalUtility.add(baseAmountGained, spsBonus);
    },

    performManualStudy() {
        if (!coreSystemsRef) {
            console.error("CoreGameplayLogic: Core systems not initialized for performManualStudy.");
            return;
        }
        const { coreResourceManager, decimalUtility, loggingSystem, coreGameStateManager } = coreSystemsRef;
        
        // MODIFIED: Use the new calculation function
        const totalAmountGained = this.calculateManualStudyGain();
        
        coreResourceManager.addAmount(staticModuleData.resourceId, totalAmountGained);
        moduleState.totalManualClicks++;
        coreGameStateManager.setModuleState('core_gameplay', { ...moduleState });

        loggingSystem.debug("CoreGameplayLogic", `Manually studied. Base gain calculated. Total Gained: ${totalAmountGained} ${staticModuleData.resourceId}. Total clicks: ${moduleState.totalManualClicks}`);
        
        return {
            amountGained: totalAmountGained, 
            newTotal: coreResourceManager.getAmount(staticModuleData.resourceId)
        };
    },

    getTotalClicks() {
        return moduleState.totalManualClicks || 0;
    }
};
