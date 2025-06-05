// modules/skills_module/skills_manifest.js (v1.1 - Persistent Unlock)

/**
 * @file skills_manifest.js
 * @description Manifest file for the Skills Module.
 * v1.1: Uses skills_logic_v1.1 for persistent tab unlock.
 */

import { staticModuleData } from './skills_data.js';
import { getInitialState, moduleState } from './skills_state.js';
import { moduleLogic } from './skills_logic.js'; // v1.1
import { ui } from './skills_ui.js';

const skillsManifest = {
    id: "skills",
    name: "Skills",
    version: "1.0.1", // Version bump for unlock logic change
    description: "Unlock and level up skills to boost your progress.",
    dependencies: ["market"], 

    async initialize(coreSystems) {
        const { staticDataAggregator, coreGameStateManager, loggingSystem, coreUIManager, gameLoop, decimalUtility } = coreSystems;

        loggingSystem.info(this.name, `Initializing ${this.name} v${this.version}...`);

        staticDataAggregator.registerStaticData(this.id, staticModuleData);

        let currentModuleState = coreGameStateManager.getModuleState(this.id);
        if (!currentModuleState || !currentModuleState.skillLevels) {
            currentModuleState = getInitialState();
        } else {
            if (typeof currentModuleState.skillLevels !== 'object' || currentModuleState.skillLevels === null) {
                currentModuleState.skillLevels = {};
            }
        }
        Object.assign(moduleState, currentModuleState); 
        coreGameStateManager.setModuleState(this.id, { ...moduleState }); 

        moduleLogic.initialize(coreSystems); 
        ui.initialize(coreSystems, moduleState, moduleLogic);

        coreUIManager.registerMenuTab(
            this.id,
            staticModuleData.ui.skillsTabLabel,
            (parentElement) => ui.renderMainContent(parentElement),
            () => moduleLogic.isSkillsTabUnlocked(), // This now checks the permanent flag
            () => ui.onShow(),
            () => ui.onHide()
        );

        gameLoop.registerUpdateCallback('uiUpdate', (deltaTime) => {
            if (coreUIManager.isActiveTab(this.id)) {
                ui.updateSkillPointsDisplay();
            }
            // Check skills tab unlock if not permanently unlocked yet
            if (!coreGameStateManager.getGlobalFlag('skillsTabPermanentlyUnlocked', false)) {
                 if(moduleLogic.isSkillsTabUnlocked()){ // This will set the flag and render menu
                     // loggingSystem.debug("SkillsManifest", "Skills tab unlocked via uiUpdate check.");
                 }
            }
        });
        
        moduleLogic.onGameLoad(); // Call after everything is set up

        loggingSystem.info(this.name, `${this.name} initialized successfully.`);

        return {
            id: this.id,
            logic: moduleLogic,
            ui: ui,
            onGameLoad: () => {
                loggingSystem.info(this.name, `onGameLoad called for ${this.name} (manifest v${this.version}).`);
                let loadedState = coreGameStateManager.getModuleState(this.id);
                if (!loadedState || !loadedState.skillLevels) {
                    loadedState = getInitialState();
                } else {
                     if (typeof loadedState.skillLevels !== 'object' || loadedState.skillLevels === null) {
                        loadedState.skillLevels = {};
                    }
                }
                Object.assign(moduleState, loadedState);
                coreGameStateManager.setModuleState(this.id, { ...moduleState });
                moduleLogic.onGameLoad(); 
                if (coreUIManager.isActiveTab(this.id)) {
                    ui.renderMainContent(document.getElementById('main-content'));
                }
            },
            onResetState: () => {
                loggingSystem.info(this.name, `onResetState called for ${this.name} (manifest v${this.version}).`);
                const initialState = getInitialState();
                Object.assign(moduleState, initialState);
                coreGameStateManager.setModuleState(this.id, { ...moduleState });
                moduleLogic.onResetState(); // This will clear 'skillsTabPermanentlyUnlocked'
                if (coreUIManager.isActiveTab(this.id)) {
                     ui.renderMainContent(document.getElementById('main-content'));
                }
            }
        };
    }
};

export default skillsManifest;
