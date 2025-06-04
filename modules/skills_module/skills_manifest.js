// modules/skills_module/skills_manifest.js 

/**
 * @file skills_manifest.js
 * @description Manifest file for the Skills Module.
 * This module introduces a skill tree for permanent bonuses.
 */

// Import module components
import { staticModuleData } from './skills_data.js';
import { getInitialState, moduleState } from './skills_state.js';
import { moduleLogic } from './skills_logic.js';
import { ui } from './skills_ui.js';

const skillsManifest = {
    id: "skills",
    name: "Skills",
    version: "0.1.0",
    description: "Unlock powerful permanent bonuses by investing Study Skill Points.",
    dependencies: ["commerce"], // Depends on commerce for 'studySkillPoints' resource

    /**
     * Initializes the Skills module.
     * This function is called by the moduleLoader.
     * @param {object} coreSystems - References to core game systems (logger, resourceManager, etc.).
     * @returns {object} The module's public API or instance.
     */
    async initialize(coreSystems) {
        const { staticDataAggregator, coreGameStateManager, coreResourceManager, coreUIManager, decimalUtility, loggingSystem, gameLoop } = coreSystems;

        loggingSystem.info(this.name, `Initializing ${this.name} v${this.version}...`);

        // 1. Register Static Data
        staticDataAggregator.registerStaticData(this.id, {
            skills: staticModuleData.skills,
            ui: staticModuleData.ui
        });

        // 2. Initialize Module State
        let currentModuleState = coreGameStateManager.getModuleState(this.id);
        if (!currentModuleState) {
            loggingSystem.info(this.name, "No saved state found for Skills module. Initializing with default state.");
            currentModuleState = getInitialState(staticModuleData); // Pass staticModuleData
            coreGameStateManager.setModuleState(this.id, currentModuleState);
        } else {
            loggingSystem.info(this.name, "Loaded state from CoreGameStateManager for Skills module.", currentModuleState);
            // Ensure skill levels are numbers (they are small, so no Decimal conversion needed for state)
            for (const skillId in staticModuleData.skills) { // Use staticModuleData to ensure all skills are covered
                if (typeof currentModuleState.skillLevels[skillId] === 'undefined') {
                    currentModuleState.skillLevels[skillId] = 0; // Add new skills if not in save
                } else {
                    currentModuleState.skillLevels[skillId] = parseInt(currentModuleState.skillLevels[skillId] || 0);
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
            staticModuleData.ui.skillsTabLabel, // Tab Label from data
            (parentElement) => ui.renderMainContent(parentElement), // Function to render content
            () => moduleLogic.isSkillsTabUnlocked(), // isUnlocked check
            () => ui.onShow(),   // onShow callback
            () => ui.onHide()    // onHide callback
        );

        // 6. Register update callbacks with the game loop
        gameLoop.registerUpdateCallback('generalLogic', (deltaTime) => {
            // Skills logic doesn't have continuous updates, but its effects
            // are applied on purchase/load, and UI updates on 'uiUpdate'
        });
        gameLoop.registerUpdateCallback('uiUpdate', (deltaTime) => {
            ui.updateDynamicElements(); // Update UI elements like costs, levels, effects
        });

        // Initial application of all skill effects after state is loaded/initialized
        moduleLogic.applyAllSkillEffects();
        // Initial check for tier unlocks
        moduleLogic.checkTierUnlocks();


        loggingSystem.info(this.name, `${this.name} initialized successfully.`);

        // Return a public API for the module if needed
        return {
            id: this.id,
            logic: moduleLogic,
            ui: ui,
            staticModuleData: staticModuleData, // Expose static data for other modules (e.g., Achievements)
            // Expose lifecycle methods for moduleLoader to broadcast
            onGameLoad: () => {
                loggingSystem.info(this.name, `onGameLoad called for ${this.name}. Reloading state.`);
                let loadedState = coreGameStateManager.getModuleState(this.id);
                if (!loadedState) {
                    loadedState = getInitialState(staticModuleData); // Pass staticModuleData
                    coreGameStateManager.setModuleState(this.id, loadedState);
                }
                // Ensure skill levels are numbers
                for (const skillId in staticModuleData.skills) { // Use staticModuleData to ensure all skills are covered
                    if (typeof loadedState.skillLevels[skillId] === 'undefined') {
                        loadedState.skillLevels[skillId] = 0;
                    } else {
                        loadedState.skillLevels[skillId] = parseInt(loadedState.skillLevels[skillId] || 0);
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
                const initialState = getInitialState(staticModuleData); // Pass staticModuleData
                Object.assign(moduleState, initialState);
                coreGameStateManager.setModuleState(this.id, initialState);
                moduleLogic.onResetState(); // Notify logic component
                 if (coreUIManager.isActiveTab(this.id)) {
                    ui.renderMainContent(document.getElementById('main-content'));
                }
            },
            // Public method to get skill level (e.g., for achievements or other modules)
            getSkillLevel: (skillId) => moduleLogic.getSkillLevel(skillId)
        };
    }
};

export default skillsManifest;
