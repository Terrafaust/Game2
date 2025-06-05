// modules/skills_module/skills_manifest.js (v1)

/**
 * @file skills_manifest.js
 * @description Manifest file for the Skills Module.
 */

import { staticModuleData } from './skills_data.js';
import { getInitialState, moduleState } from './skills_state.js';
import { moduleLogic } from './skills_logic.js';
import { ui } from './skills_ui.js';

const skillsManifest = {
    id: "skills",
    name: "Skills",
    version: "1.0.0",
    description: "Unlock and level up skills to boost your progress.",
    dependencies: ["market"], // Depends on market for Study Skill Points

    /**
     * Initializes the Skills module.
     * @param {object} coreSystems - References to core game systems.
     * @returns {object} The module's public API or instance.
     */
    async initialize(coreSystems) {
        const { staticDataAggregator, coreGameStateManager, loggingSystem, coreUIManager, gameLoop, decimalUtility } = coreSystems;

        loggingSystem.info(this.name, `Initializing ${this.name} v${this.version}...`);

        // 1. Register Static Data (skills definitions)
        staticDataAggregator.registerStaticData(this.id, staticModuleData);

        // "Study Skill Points" resource is defined by the Market module.
        // This module consumes it.

        // 2. Initialize Module State
        let currentModuleState = coreGameStateManager.getModuleState(this.id);
        if (!currentModuleState || !currentModuleState.skillLevels) {
            loggingSystem.info(this.name, "No/invalid saved state for Skills. Initializing with default.");
            currentModuleState = getInitialState();
        } else {
            loggingSystem.info(this.name, "Loaded state for Skills module.", currentModuleState);
            // Ensure skillLevels is an object
            if (typeof currentModuleState.skillLevels !== 'object' || currentModuleState.skillLevels === null) {
                currentModuleState.skillLevels = {};
            }
        }
        Object.assign(moduleState, currentModuleState); // Update local reactive state
        coreGameStateManager.setModuleState(this.id, { ...moduleState }); // Persist potentially cleaned state

        // 3. Initialize Logic
        moduleLogic.initialize(coreSystems); // Registers skill effects with CoreUpgradeManager

        // 4. Initialize UI
        ui.initialize(coreSystems, moduleState, moduleLogic);

        // 5. Register Menu Tab
        coreUIManager.registerMenuTab(
            this.id,
            staticModuleData.ui.skillsTabLabel,
            (parentElement) => ui.renderMainContent(parentElement),
            () => moduleLogic.isSkillsTabUnlocked(), // Unlock condition
            () => ui.onShow(),
            () => ui.onHide()
        );

        // 6. Register update callbacks (e.g., for UI that depends on skill point changes)
        gameLoop.registerUpdateCallback('uiUpdate', (deltaTime) => {
            if (coreUIManager.isActiveTab(this.id)) {
                ui.updateSkillPointsDisplay(); // Keep skill points up-to-date
                // Individual skill card updates are mostly event-driven or on tab show
            }
        });
        
        loggingSystem.info(this.name, `${this.name} initialized successfully.`);

        return {
            id: this.id,
            logic: moduleLogic,
            ui: ui,
            onGameLoad: () => {
                loggingSystem.info(this.name, `onGameLoad called for ${this.name}. Reloading state.`);
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
                moduleLogic.onGameLoad(); // Notifies logic, re-registers effects
                if (coreUIManager.isActiveTab(this.id)) {
                    ui.renderMainContent(document.getElementById('main-content'));
                }
            },
            onResetState: () => {
                loggingSystem.info(this.name, `onResetState called for ${this.name}. Resetting state.`);
                const initialState = getInitialState();
                Object.assign(moduleState, initialState);
                coreGameStateManager.setModuleState(this.id, { ...moduleState });
                moduleLogic.onResetState();
                if (coreUIManager.isActiveTab(this.id)) {
                     ui.renderMainContent(document.getElementById('main-content'));
                }
            }
        };
    }
};

export default skillsManifest;
