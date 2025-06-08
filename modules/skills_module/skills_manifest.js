// modules/skills_module/skills_manifest.js (v1.4 - Robust State Initialization)
/**
 * @file skills_manifest.js
 * @description Manifest file for the Skills Module.
 * v1.4: Implements robust state initialization to prevent crashes on new/old saves.
 * v1.3: Implements onPrestigeReset to only reset regular skills.
 */

import { staticModuleData } from './skills_data.js';
import { getInitialState, moduleState } from './skills_state.js';
import { moduleLogic } from './skills_logic.js';
import { ui } from './skills_ui.js';

const skillsManifest = {
    id: "skills",
    name: "Skills",
    version: "1.4.0",
    description: "Unlock and level up skills to boost your progress.",
    dependencies: ["market"], 

    async initialize(coreSystems) {
        const { staticDataAggregator, coreGameStateManager, loggingSystem, coreUIManager, gameLoop } = coreSystems;

        loggingSystem.info(this.name, `Initializing ${this.name} v${this.version}...`);

        staticDataAggregator.registerStaticData(this.id, staticModuleData);

        // --- CHANGE: More robust state initialization ---
        const initialState = getInitialState();
        const loadedState = coreGameStateManager.getModuleState(this.id);
        
        // Merge the loaded state over the default initial state.
        // This ensures that if new properties are added to the state in an update,
        // they will exist even when loading an older save.
        const finalState = { ...initialState, ...loadedState };

        // Ensure nested objects are valid, just in case.
        finalState.skillLevels = finalState.skillLevels || {};
        finalState.prestigeSkillLevels = finalState.prestigeSkillLevels || {};
        
        Object.assign(moduleState, finalState);
        coreGameStateManager.setModuleState(this.id, { ...moduleState });
        // --- END CHANGE ---

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
                // Use the same robust initialization logic on game load
                const reloadedState = coreGameStateManager.getModuleState(this.id);
                const reloadedFinalState = { ...getInitialState(), ...reloadedState };
                reloadedFinalState.skillLevels = reloadedFinalState.skillLevels || {};
                reloadedFinalState.prestigeSkillLevels = reloadedFinalState.prestigeSkillLevels || {};

                Object.assign(moduleState, reloadedFinalState);
                coreGameStateManager.setModuleState(this.id, { ...moduleState });

                moduleLogic.onGameLoad();
                if (coreUIManager.isActiveTab(this.id)) {
                    ui.renderMainContent(document.getElementById('main-content'));
                }
            },
            onResetState: () => {
                loggingSystem.info(this.name, `onResetState called for ${this.name}. Resetting ALL skills.`);
                const initialStateOnReset = getInitialState();
                Object.assign(moduleState, initialStateOnReset);
                coreGameStateManager.setModuleState(this.id, { ...moduleState });
                moduleLogic.onResetState();
                if (coreUIManager.isActiveTab(this.id)) {
                     ui.renderMainContent(document.getElementById('main-content'));
                }
            },
            onPrestigeReset: () => {
                loggingSystem.info(this.name, `onPrestigeReset called for ${this.name}. Resetting regular skills only.`);
                
                const currentState = coreGameStateManager.getModuleState(this.id) || getInitialState();
                
                currentState.skillLevels = {};
                
                coreGameStateManager.setModuleState(this.id, currentState);
                Object.assign(moduleState, currentState);
                
                moduleLogic.onPrestigeReset();
                
                 if (coreUIManager.isActiveTab(this.id)) {
                     ui.renderMainContent(document.getElementById('main-content'));
                }
            }
        };
    }
};

export default skillsManifest;
