// js/modules/core_gameplay_module/core_gameplay_logic.js

/**
 * @file core_gameplay_logic.js
 * @description Contains the business logic for the Core Gameplay module,
 * primarily handling the manual resource gain.
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
        // If initialStateRef was different, we might do: Object.assign(moduleState, initialStateRef);
        coreSystemsRef.loggingSystem.debug("CoreGameplayLogic", "Logic initialized.");
    },

    /**
     * Handles the action of manually gaining resources (e.g., clicking the "Study" button).
     */
    performManualStudy() {
        if (!coreSystemsRef) {
            console.error("CoreGameplayLogic: Core systems not initialized.");
            return;
        }
        const { coreResourceManager, decimalUtility, loggingSystem, coreGameStateManager } = coreSystemsRef;
        
        const amountGained = decimalUtility.new(staticModuleData.clickAmount);
        coreResourceManager.addAmount(staticModuleData.resourceId, amountGained);

        moduleState.totalManualClicks++;
        // Persist the change in totalManualClicks to the global game state
        coreGameStateManager.setModuleState('core_gameplay', { ...moduleState });


        loggingSystem.debug("CoreGameplayLogic", `Manually studied. Gained ${amountGained} ${staticModuleData.resourceId}. Total clicks: ${moduleState.totalManualClicks}`);
        
        // Update UI (resource bar will update via its own mechanism, but if there's module-specific UI, update it)
        // The UI component might call this, or this logic might trigger a UI update.
        // For now, coreUIManager handles resource bar updates.
        // If this module had its own display of totalManualClicks, ui.updateDisplay() would be called.
        return {
            amountGained: amountGained,
            newTotal: coreResourceManager.getAmount(staticModuleData.resourceId)
        };
    },

    getTotalClicks() {
        return moduleState.totalManualClicks;
    }
};
