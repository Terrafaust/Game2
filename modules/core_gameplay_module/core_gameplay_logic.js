// modules/core_gameplay_module/core_gameplay_logic.js (v2)

/**
 * @file core_gameplay_logic.js
 * @description Contains the business logic for the Core Gameplay module,
 * primarily handling the manual resource gain.
 * v2: Adds a bonus to manual study based on current SP/s.
 */

import { staticModuleData } from './core_gameplay_data.js';
// moduleState will be populated by the manifest's initialize function
import { moduleState } from './core_gameplay_state.js';

let coreSystemsRef = null; // To store references to core game systems

export const moduleLogic = {
    /**
     * Initializes the logic component with core system references and module state.
     * @param {object} coreSystems - References to core game systems.
     * @param {object} initialStateRef - Reference to the module's reactive state object.
     */
    initialize(coreSystems, initialStateRef) { // initialStateRef is moduleState from state.js
        coreSystemsRef = coreSystems;
        // moduleState is already imported and will be updated by the manifest.
        coreSystemsRef.loggingSystem.info("CoreGameplayLogic", "Logic initialized (v2).");
    },

    /**
     * Handles the action of manually gaining resources (e.g., clicking the "Study" button).
     * Now includes a bonus of 10% of current SP/s.
     */
    performManualStudy() {
        if (!coreSystemsRef) {
            coreSystemsRef.loggingSystem.error("CoreGameplayLogic", "Core systems not initialized for performManualStudy.");
            return;
        }
        const { coreResourceManager, decimalUtility, loggingSystem, coreGameStateManager } = coreSystemsRef;
        
        // Base amount from clicking
        const baseAmountGained = decimalUtility.new(staticModuleData.clickAmount);

        // Calculate bonus: 10% of current Study Points per second
        const currentSps = coreResourceManager.getTotalProductionRate('studyPoints');
        const bonusPercentage = decimalUtility.new(0.10); // 10%
        const spsBonus = decimalUtility.multiply(currentSps, bonusPercentage);

        // Total amount gained
        const totalAmountGained = decimalUtility.add(baseAmountGained, spsBonus);
        
        coreResourceManager.addAmount(staticModuleData.resourceId, totalAmountGained);

        moduleState.totalManualClicks++;
        // Persist the change in totalManualClicks to the global game state
        coreGameStateManager.setModuleState('core_gameplay', { ...moduleState });


        loggingSystem.debug("CoreGameplayLogic", `Manually studied. Base: ${baseAmountGained}, SPS Bonus: ${spsBonus}. Total Gained: ${totalAmountGained} ${staticModuleData.resourceId}. Total clicks: ${moduleState.totalManualClicks}`);
        
        // Update UI (resource bar will update via its own mechanism, but if there's module-specific UI, update it)
        // The UI component might call this, or this logic might trigger a UI update.
        // For now, coreUIManager handles resource bar updates.
        return {
            amountGained: totalAmountGained, // Return total amount
            newTotal: coreResourceManager.getAmount(staticModuleData.resourceId)
        };
    },

    getTotalClicks() {
        return moduleState.totalManualClicks;
    }
};
