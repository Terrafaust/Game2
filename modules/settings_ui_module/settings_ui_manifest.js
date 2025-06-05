// modules/settings_ui_module/settings_ui_manifest.js (v1.1 - System Pass Fix)

/**
 * @file settings_ui_manifest.js
 * @description Manifest file for the Settings UI Module.
 * v1.1: Ensures coreSystems is correctly passed to ui.initialize.
 */

import { staticModuleData } from './settings_ui_data.js';
import { getInitialState, moduleState } from './settings_ui_state.js';
import { moduleLogic } from './settings_ui_logic.js';
import { ui } from './settings_ui_ui.js';

const settingsUiManifest = {
    id: "settings_ui",
    name: "Settings UI",
    version: "1.0.1", // Version bump for fix
    description: "Provides UI for game settings, statistics, and actions.",
    dependencies: ["market"], 

    async initialize(coreSystems) { // coreSystems is received here from moduleLoader
        const { staticDataAggregator, coreGameStateManager, loggingSystem, coreUIManager, gameLoop } = coreSystems;

        loggingSystem.info(this.name, `Initializing ${this.name} v${this.version}...`);
        
        // --- Diagnostic Log ---
        if (!coreSystems.globalSettingsManager) {
            loggingSystem.error("SettingsUIManifest_Init_CRITICAL", "globalSettingsManager is MISSING in coreSystems at manifest init!", Object.keys(coreSystems));
        } else {
            loggingSystem.debug("SettingsUIManifest_Init", "globalSettingsManager is PRESENT in coreSystems at manifest init.");
        }
        // --- End Diagnostic Log ---


        staticDataAggregator.registerStaticData(this.id, staticModuleData);

        let currentModuleState = coreGameStateManager.getModuleState(this.id);
        if (!currentModuleState) {
            currentModuleState = getInitialState();
        }
        Object.assign(moduleState, currentModuleState);
        coreGameStateManager.setModuleState(this.id, { ...moduleState });

        // Pass the full coreSystems object to logic and ui initialize methods
        moduleLogic.initialize(coreSystems); 
        ui.initialize(coreSystems, moduleState, moduleLogic); // Ensure coreSystems is passed here

        coreUIManager.registerMenuTab(
            this.id,
            staticModuleData.ui.settingsTabLabel,
            (parentElement) => ui.renderMainContent(parentElement),
            () => moduleLogic.isSettingsTabUnlocked(), 
            () => ui.onShow(),
            () => ui.onHide()
        );
        
        moduleLogic.onGameLoad();

        gameLoop.registerUpdateCallback('uiUpdate', (deltaTime) => {
            if (coreUIManager.isActiveTab(this.id)) {
                // ui.updateDynamicElements(); // Called by onShow, which is called by setActiveTab
            }
            if (!coreGameStateManager.getGlobalFlag('settingsTabPermanentlyUnlocked', false)) {
                 if(moduleLogic.isSettingsTabUnlocked()){
                    // This sets the flag and calls coreUIManager.renderMenu()
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
                    const mainContentEl = document.getElementById('main-content');
                    if (mainContentEl) ui.renderMainContent(mainContentEl);
                }
            },
            onResetState: () => {
                loggingSystem.info(this.name, `onResetState called for ${this.name}.`);
                const initialState = getInitialState();
                Object.assign(moduleState, initialState);
                coreGameStateManager.setModuleState(this.id, initialState);
                moduleLogic.onResetState(); 
                 if (coreUIManager.isActiveTab(this.id)) {
                    const mainContentEl = document.getElementById('main-content');
                    if (mainContentEl) ui.renderMainContent(mainContentEl);
                }
            }
        };
    }
};

export default settingsUiManifest;
