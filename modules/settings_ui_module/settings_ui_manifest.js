// modules/settings_ui_module/settings_ui_manifest.js 

/**
 * @file settings_ui_manifest.js
 * @description Manifest file for the Settings UI Module.
 * This module provides the user interface for game settings, including themes,
 * statistics, save/load, and logs.
 */

// Import module components
import { staticModuleData } from './settings_ui_data.js';
import { getInitialState, moduleState } from './settings_ui_state.js';
import { moduleLogic } from './settings_ui_logic.js';
import { ui } from './settings_ui_ui.js';

const settingsUIManifest = {
    id: "settings_ui",
    name: "Settings",
    version: "0.1.0",
    description: "Configure various aspects of your game experience.",
    dependencies: ["commerce"], // Depends on commerce for 'settingsMenuUnlocked' flag

    /**
     * Initializes the Settings UI module.
     * This function is called by the moduleLoader.
     * @param {object} coreSystems - References to core game systems (logger, resourceManager, etc.).
     * @returns {object} The module's public API or instance.
     */
    async initialize(coreSystems) {
        const { staticDataAggregator, coreGameStateManager, coreResourceManager, coreUIManager, decimalUtility, loggingSystem, gameLoop } = coreSystems;

        loggingSystem.info(this.name, `Initializing ${this.name} v${this.version}...`);

        // 1. Register Static Data
        staticDataAggregator.registerStaticData(this.id, {
            sections: staticModuleData.sections,
            ui: staticModuleData.ui
        });

        // 2. Initialize Module State
        let currentModuleState = coreGameStateManager.getModuleState(this.id);
        if (!currentModuleState) {
            loggingSystem.info(this.name, "No saved state found for Settings UI module. Initializing with default state.");
            currentModuleState = getInitialState();
            coreGameStateManager.setModuleState(this.id, currentModuleState);
        } else {
            loggingSystem.info(this.name, "Loaded state from CoreGameStateManager for Settings UI module.", currentModuleState);
            // No Decimal conversion needed for boolean flags, but ensure consistency
            for (const sectionId in staticModuleData.sections) {
                if (staticModuleData.sections[sectionId].unlockCondition.type === "resource" && typeof currentModuleState.unlockedSections[sectionId] === 'undefined') {
                    currentModuleState.unlockedSections[sectionId] = false; // Add new sections if not in save
                }
            }
            Object.assign(moduleState, currentModuleState); // Update local moduleState
        }

        // 3. Initialize Logic (pass references to core systems)
        moduleLogic.initialize(coreSystems);

        // 4. Initialize UI (pass references to core systems and logic)
        ui.initialize(coreSystems, moduleLogic);

        // 5. Register the module's main tab/view with the UIManager
        coreUIManager.registerMenuTab(
            this.id,
            staticModuleData.ui.settingsTabLabel, // Tab Label from data
            (parentElement) => ui.renderMainContent(parentElement), // Function to render content
            () => moduleLogic.isSettingsTabUnlocked(), // isUnlocked check
            () => ui.onShow(),   // onShow callback
            () => ui.onHide()    // onHide callback
        );

        // 6. Register update callbacks with the game loop
        gameLoop.registerUpdateCallback('uiUpdate', (deltaTime) => {
            ui.updateDynamicElements(); // Update UI elements like current theme/language, unlock button states
        });

        loggingSystem.info(this.name, `${this.name} initialized successfully.`);

        // Return a public API for the module if needed
        return {
            id: this.id,
            logic: moduleLogic,
            ui: ui,
            // Expose lifecycle methods for moduleLoader to broadcast
            onGameLoad: () => {
                loggingSystem.info(this.name, `onGameLoad called for ${this.name}. Reloading state.`);
                let loadedState = coreGameStateManager.getModuleState(this.id);
                if (!loadedState) {
                    loadedState = getInitialState();
                    coreGameStateManager.setModuleState(this.id, loadedState);
                }
                // Ensure consistency for new sections or missing flags
                for (const sectionId in staticModuleData.sections) {
                    if (staticModuleData.sections[sectionId].unlockCondition.type === "resource" && typeof loadedState.unlockedSections[sectionId] === 'undefined') {
                        loadedState.unlockedSections[sectionId] = false;
                    }
                }
                Object.assign(moduleState, loadedState); // Update local moduleState
                moduleLogic.onGameLoad(); // Notify logic component
                if (coreUIManager.isActiveTab(this.id)) {
                    ui.renderMainContent(document.getElementById('main-content')); // Re-render if active
                }
            },
            onResetState: () => {
                loggingSystem.info(this.name, `onResetState called for ${this.name}. Resetting state.`);
                const initialState = getInitialState();
                Object.assign(moduleState, initialState);
                coreGameStateManager.setModuleState(this.id, initialState);
                moduleLogic.onResetState(); // Notify logic component
                 if (coreUIManager.isActiveTab(this.id)) {
                    ui.renderMainContent(document.getElementById('main-content'));
                }
            },
            // Public method to check if a settings section is unlocked (e.g., for other modules to query)
            isSectionUnlocked: (sectionId) => moduleLogic.isSectionUnlocked(sectionId)
        };
    }
};

export default settingsUIManifest;
