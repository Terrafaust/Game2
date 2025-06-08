// modules/core_gameplay_module/core_gameplay_logic.js (v2.3 - Global Bonus Integration)

/**
 * @file core_gameplay_logic.js
 * @description Contains the business logic for the Core Gameplay module.
 * v2.3: Manual click gain now benefits from all production multipliers.
 * v2.2: Added calculateManualStudyGain to expose click value to UI.
 */

import { staticModuleData } from './core_gameplay_data.js';
import { moduleState } from './core_gameplay_state.js';

let coreSystemsRef = null; 

export const moduleLogic = {
    initialize(coreSystems, initialStateRef) { 
        coreSystemsRef = coreSystems;
        coreSystemsRef.loggingSystem.info("CoreGameplayLogic", "Logic initialized (v2.3).");
    },

    calculateManualStudyGain() {
        if (!coreSystemsRef) return new (self.Decimal || Decimal)(0);
        const { coreResourceManager, coreUpgradeManager, decimalUtility } = coreSystemsRef;
        
        let baseAmountGained = decimalUtility.new(staticModuleData.clickAmount);
        
        // Bonus from SPS
        const currentSps = coreResourceManager.getTotalProductionRate('studyPoints');
        const bonusPercentage = decimalUtility.new(0.10); 
        const spsBonus = decimalUtility.multiply(currentSps, bonusPercentage);
        
        let totalGain = decimalUtility.add(baseAmountGained, spsBonus);

        // --- MODIFICATION: Apply all relevant multipliers to the click gain ---
        // 1. Specific click multiplier (from achievements, etc.)
        const clickMultiplier = coreUpgradeManager.getProductionMultiplier('core_gameplay_click', 'studyPoints');
        totalGain = decimalUtility.multiply(totalGain, clickMultiplier);

        // 2. Global multiplier for the resource being generated (Study Points)
        const globalResourceMultiplier = coreUpgradeManager.getProductionMultiplier('global_resource_production', 'studyPoints');
        totalGain = decimalUtility.multiply(totalGain, globalResourceMultiplier);

        // 3. Global multiplier for ALL production
        const globalAllMultiplier = coreUpgradeManager.getProductionMultiplier('global_production', 'all');
        totalGain = decimalUtility.multiply(totalGain, globalAllMultiplier);
        // --- END MODIFICATION ---

        return totalGain;
    },

    performManualStudy() {
        if (!coreSystemsRef) {
            console.error("CoreGameplayLogic: Core systems not initialized for performManualStudy.");
            return;
        }
        const { coreResourceManager, decimalUtility, loggingSystem, coreGameStateManager } = coreSystemsRef;
        
        const totalAmountGained = this.calculateManualStudyGain();
        
        coreResourceManager.addAmount(staticModuleData.resourceId, totalAmountGained);
        moduleState.totalManualClicks++;
        coreGameStateManager.setModuleState('core_gameplay', { ...moduleState });

        loggingSystem.debug("CoreGameplayLogic", `Manually studied. Total Gained: ${totalAmountGained} ${staticModuleData.resourceId}. Total clicks: ${moduleState.totalManualClicks}`);
        
        return {
            amountGained: totalAmountGained, 
            newTotal: coreResourceManager.getAmount(staticModuleData.resourceId)
        };
    },

    getTotalClicks() {
        return moduleState.totalManualClicks || 0;
    }
};
