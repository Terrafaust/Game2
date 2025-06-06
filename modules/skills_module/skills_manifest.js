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
        // Destructure core systems needed for initialization
        const { staticDataAggregator, coreGameStateManager, loggingSystem, coreUIManager, gameLoop, decimalUtility } = coreSystems;

        loggingSystem.info(this.name, `Initializing ${this.name} v${this.version}...`);

        // Register static data for the module
        staticDataAggregator.registerStaticData(this.id, staticModuleData);

        // Load current module state, or initialize if not found
        let currentModuleState = coreGameStateManager.getModuleState(this.id);
        if (!currentModuleState || !currentModuleState.skillLevels) {
            currentModuleState = getInitialState();
        } else {
            // Ensure skillLevels is an object if it exists but is not an object, to prevent errors
            if (typeof currentModuleState.skillLevels !== 'object' || currentModuleState.skillLevels === null) {
                currentModuleState.skillLevels = {};
            }
        }
        // Apply loaded/initial state to the module's internal state
        Object.assign(moduleState, currentModuleState);
        // Persist the initial or loaded state back to the game state manager
        coreGameStateManager.setModuleState(this.id, { ...moduleState });

        // Initialize module logic and UI components with core systems
        moduleLogic.initialize(coreSystems);
        ui.initialize(coreSystems, moduleState, moduleLogic);

        // Register the Skills menu tab with the UI manager
        coreUIManager.registerMenuTab(
            this.id, // Module ID
            staticModuleData.ui.skillsTabLabel, // Label for the tab
            (parentElement) => ui.renderMainContent(parentElement), // Function to render tab content
            () => moduleLogic.isSkillsTabUnlocked(), // Callback to check if the tab is unlocked (uses new persistent logic)
            () => ui.onShow(), // Callback when the tab is shown
            () => ui.onHide() // Callback when the tab is hidden
        );

        // Register a game loop update callback for continuous UI updates and unlock checks
        gameLoop.registerUpdateCallback('uiUpdate', (deltaTime) => {
            // Only update skill points display if the skills tab is currently active
            if (coreUIManager.isActiveTab(this.id)) {
                ui.updateSkillPointsDisplay();
            }
            // Check skills tab unlock condition if it's not already permanently unlocked
            if (!coreGameStateManager.getGlobalFlag('skillsTabPermanentlyUnlocked', false)) {
                 if(moduleLogic.isSkillsTabUnlocked()){ // This call handles setting the permanent flag and re-rendering the menu if unlocked
                     // Optional: loggingSystem.debug("SkillsManifest", "Skills tab unlocked via uiUpdate check.");
                 }
            }
        });
        
        // Call onGameLoad immediately after setup to ensure initial state is processed
        moduleLogic.onGameLoad();

        loggingSystem.info(this.name, `${this.name} initialized successfully.`);

        // Return the module interface for integration with other core systems
        return {
            id: this.id,
            logic: moduleLogic,
            ui: ui,
            // Callback for when the game loads (e.g., from save)
            onGameLoad: () => {
                loggingSystem.info(this.name, `onGameLoad called for ${this.name} (manifest v${this.version}).`);
                let loadedState = coreGameStateManager.getModuleState(this.id);
                if (!loadedState || !loadedState.skillLevels) {
                    loadedState = getInitialState();
                } else {
                     // Ensure skillLevels is an object after loading, similar to initialization
                     if (typeof loadedState.skillLevels !== 'object' || loadedState.skillLevels === null) {
                        loadedState.skillLevels = {};
                    }
                }
                Object.assign(moduleState, loadedState);
                coreGameStateManager.setModuleState(this.id, { ...moduleState });
                moduleLogic.onGameLoad(); // Propagate onGameLoad to module logic
                if (coreUIManager.isActiveTab(this.id)) {
                    ui.renderMainContent(document.getElementById('main-content')); // Re-render UI if tab is active
                }
            },
            // Callback for when the game state is reset (e.g., prestige)
            onResetState: () => { // Renamed from onPrestigeReset for more general use
                loggingSystem.info(this.name, `onResetState called for ${this.name} (manifest v${this.version}).`);
                const initialState = getInitialState();
                Object.assign(moduleState, initialState);
                coreGameStateManager.setModuleState(this.id, { ...moduleState }); // Use spread to ensure shallow copy for state update
                moduleLogic.onResetState(); // This will clear 'skillsTabPermanentlyUnlocked' and reset logic state
                if (coreUIManager.isActiveTab(this.id)) {
                     ui.renderMainContent(document.getElementById('main-content')); // Re-render UI if tab is active
                }
            }
        };
    }
};

export default skillsManifest;
