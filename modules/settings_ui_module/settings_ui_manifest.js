// modules/settings_ui_module/settings_ui_manifest.js (v1)

/**
 * @file settings_ui_manifest.js
 * @description Manifest file for the Settings UI Module.
 */

import { staticModuleData } from './settings_ui_data.js';
import { getInitialState, moduleState } from './settings_ui_state.js';
import { moduleLogic } from './settings_ui_logic.js';
import { ui } from './settings_ui_ui.js';

const settingsUiManifest = {
    id: "settings_ui",
    name: "Settings UI",
    version: "1.0.0",
    description: "Provides UI for game settings, statistics, and actions.",
    dependencies: ["market"], // Depends on market for the `settingsTabUnlocked` flag

    async initialize(coreSystems) {
        const { staticDataAggregator, coreGameStateManager, loggingSystem, coreUIManager, gameLoop } = coreSystems;

        loggingSystem.info(this.name, `Initializing ${this.name} v${this.version}...`);

        // 1. Register Static Data
        staticDataAggregator.registerStaticData(this.id, staticModuleData);

        // 2. Initialize Module State (if any specific to this module)
        let currentModuleState = coreGameStateManager.getModuleState(this.id);
        if (!currentModuleState) {
            currentModuleState = getInitialState();
        }
        Object.assign(moduleState, currentModuleState);
        coreGameStateManager.setModuleState(this.id, { ...moduleState });

        // 3. Initialize Logic
        moduleLogic.initialize(coreSystems);

        // 4. Initialize UI
        ui.initialize(coreSystems, moduleState, moduleLogic);

        // 5. Register Menu Tab
        coreUIManager.registerMenuTab(
            this.id,
            staticModuleData.ui.settingsTabLabel,
            (parentElement) => ui.renderMainContent(parentElement),
            () => moduleLogic.isSettingsTabUnlocked(), // Checks permanent flag
            () => ui.onShow(),
            () => ui.onHide()
        );
        
        // Call onGameLoad once here to ensure flag is checked
        moduleLogic.onGameLoad();


        // No specific game loop updates needed for settings UI itself usually,
        // unless for live stats, which are handled by updateDynamicElements onShow/periodically.
        gameLoop.registerUpdateCallback('uiUpdate', (deltaTime) => {
            if (coreUIManager.isActiveTab(this.id)) {
                // Potentially update stats if they need to be very live
                // For now, stats update on tab show.
                // ui.updateDynamicElements();
            }
             // Check settings tab unlock if not permanently unlocked yet
            if (!coreGameStateManager.getGlobalFlag('settingsTabPermanentlyUnlocked', false)) {
                 if(moduleLogic.isSettingsTabUnlocked()){
                     // loggingSystem.debug("SettingsManifest", "Settings tab unlocked via uiUpdate check.");
                 }
            }
        });


        loggingSystem.info(this.name, `${this.name} initialized successfully.`);

        return {
            id: this.id,
            logic: moduleLogic,
            ui: ui,
            onGameLoad: () => {
                loggingSystem.info(this.name, `onGameLoad called for ${this.name}.`);
                let loadedState = coreGameStateManager.getModuleState(this.id);
                if (!loadedState) loadedState = getInitialState();
                Object.assign(moduleState, loadedState);
                coreGameStateManager.setModuleState(this.id, { ...moduleState });
                moduleLogic.onGameLoad();
                if (coreUIManager.isActiveTab(this.id)) {
                    ui.renderMainContent(document.getElementById('main-content'));
                }
            },
            onResetState: () => {
                loggingSystem.info(this.name, `onResetState called for ${this.name}.`);
                const initialState = getInitialState();
                Object.assign(moduleState, initialState);
                coreGameStateManager.setModuleState(this.id, initialState);
                moduleLogic.onResetState(); // This will clear 'settingsTabPermanentlyUnlocked'
                 if (coreUIManager.isActiveTab(this.id)) {
                    ui.renderMainContent(document.getElementById('main-content'));
                }
            }
        };
    }
};

export default settingsUiManifest;
