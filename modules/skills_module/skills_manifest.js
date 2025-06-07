// modules/skills_module/skills_manifest.js (v1.3 - Prestige Reset Fix)
/**
 * @file skills_manifest.js
 * @description Manifest file for the Skills Module.
 * v1.3: Implements onPrestigeReset to only reset regular skills.
 */

import { staticModuleData } from './skills_data.js';
import { getInitialState, moduleState } from './skills_state.js';
import { moduleLogic } from './skills_logic.js';
import { ui } from './skills_ui.js';

const skillsManifest = {
    id: "skills",
    name: "Skills",
    version: "1.3.0", // Version bump for prestige reset fix
    description: "Unlock and level up skills to boost your progress.",
    dependencies: ["market"], 

    async initialize(coreSystems) {
        const { staticDataAggregator, coreGameStateManager, loggingSystem, coreUIManager, gameLoop } = coreSystems;

        loggingSystem.info(this.name, `Initializing ${this.name} v${this.version}...`);

        staticDataAggregator.registerStaticData(this.id, staticModuleData);

        let currentModuleState = coreGameStateManager.getModuleState(this.id);
        if (!currentModuleState) {
            currentModuleState = getInitialState();
        } else {
            if (typeof currentModuleState.skillLevels !== 'object' || currentModuleState.skillLevels === null) {
                currentModuleState.skillLevels = {};
            }
            if (typeof currentModuleState.prestigeSkillLevels !== 'object' || currentModuleState.prestigeSkillLevels === null) {
                currentModuleState.prestigeSkillLevels = {};
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
            () => moduleLogic.isSkillsTabUnlocked(),
            () => ui.onShow(),
            () => ui.onHide()
        );

        gameLoop.registerUpdateCallback('uiUpdate', () => {
            if (coreUIManager.isActiveTab(this.id)) {
                ui.updateSkillPointsDisplay(false);
                ui.updateSkillPointsDisplay(true);
            }
            if (!coreGameStateManager.getGlobalFlag('skillsTabPermanentlyUnlocked', false)) {
                 if(moduleLogic.isSkillsTabUnlocked()){}
            }
        });
        
        moduleLogic.onGameLoad();

        loggingSystem.info(this.name, `${this.name} initialized successfully.`);

        return {
            id: this.id,
            logic: moduleLogic,
            ui: ui,
            onGameLoad: () => {
                loggingSystem.info(this.name, `onGameLoad called for ${this.name}.`);
                let loadedState = coreGameStateManager.getModuleState(this.id);
                if (!loadedState) {
                    loadedState = getInitialState();
                } else {
                     if (typeof loadedState.skillLevels !== 'object' || loadedState.skillLevels === null) {
                        loadedState.skillLevels = {};
                    }
                    if (typeof loadedState.prestigeSkillLevels !== 'object' || loadedState.prestigeSkillLevels === null) {
                        loadedState.prestigeSkillLevels = {};
                    }
                }
                Object.assign(moduleState, loadedState);
                coreGameStateManager.setModuleState(this.id, { ...moduleState });
                moduleLogic.onGameLoad();
                if (coreUIManager.isActiveTab(this.id)) {
                    ui.renderMainContent(document.getElementById('main-content'));
                }
            },
            // --- FIX: This handles a hard reset of the entire game ---
            onResetState: () => {
                loggingSystem.info(this.name, `onResetState called for ${this.name}. Resetting ALL skills.`);
                const initialState = getInitialState();
                Object.assign(moduleState, initialState);
                coreGameStateManager.setModuleState(this.id, { ...moduleState });
                moduleLogic.onResetState();
                if (coreUIManager.isActiveTab(this.id)) {
                     ui.renderMainContent(document.getElementById('main-content'));
                }
            },
            // --- FEATURE: This handles a prestige, keeping prestige skills ---
            onPrestigeReset: () => {
                loggingSystem.info(this.name, `onPrestigeReset called for ${this.name}. Resetting regular skills only.`);
                
                // Get the current state, which includes prestige skill levels
                const currentState = coreGameStateManager.getModuleState(this.id) || getInitialState();
                
                // Reset only the regular skill levels and SSP
                currentState.skillLevels = {};
                // The SSP resource is reset automatically by the resource manager
                
                // Save the modified state back
                coreGameStateManager.setModuleState(this.id, currentState);
                Object.assign(moduleState, currentState); // Sync the local state
                
                // Tell the logic to re-register effects with the new state
                moduleLogic.onPrestigeReset();
                
                 if (coreUIManager.isActiveTab(this.id)) {
                     ui.renderMainContent(document.getElementById('main-content'));
                }
            }
        };
    }
};

export default skillsManifest;

