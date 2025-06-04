// js/modules/core_gameplay_module/core_gameplay_logic.js (v4)

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
        const { coreResourceManager, decimalUtility, loggingSystem, coreGameStateManager, coreUIManager, moduleLoader } = coreSystemsRef;
        
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

        // Check if Studies tab should be unlocked and trigger menu re-render if it is.
        const studiesModule = moduleLoader.getModule('studies');
        if (studiesModule && studiesModule.logic && typeof studiesModule.logic.isStudiesTabUnlocked === 'function') {
            if (studiesModule.logic.isStudiesTabUnlocked()) {
                // Only re-render menu if it's not already unlocked to prevent unnecessary calls
                const studiesTabDef = studiesModule.staticModuleData.ui.studiesTabUnlockCondition;
                const currentSP = coreResourceManager.getAmount(studiesTabDef.resourceId);
                const requiredSP = decimalUtility.new(studiesTabDef.amount);
                if (decimalUtility.gte(currentSP, requiredSP)) {
                    // Check if the tab is actually registered and visible
                    const isTabVisible = coreUIManager.getRegisteredMenuTabs().some(tab => tab.id === 'studies' && tab.isUnlocked());
                    if (!isTabVisible) {
                        coreUIManager.renderMenu(); // Trigger menu re-render
                        coreUIManager.showNotification("New tab unlocked: Studies!", 'info', 3000);
                    }
                }
            }
        }

        return {
            amountGained: amountGained,
            newTotal: coreResourceManager.getAmount(staticModuleData.resourceId)
        };
    },

    getTotalClicks() {
        return moduleState.totalManualClicks;
    }
};
