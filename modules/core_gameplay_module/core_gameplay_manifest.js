// js/modules/core_gameplay_module/core_gameplay_manifest.js

/**
 * @file core_gameplay_manifest.js
 * @description Manifest file for the Core Gameplay Module.
 * This module introduces the initial manual resource generation mechanic.
 */

// Import module components
import { staticModuleData } from './core_gameplay_data.js';
import { getInitialState, moduleState } from './core_gameplay_state.js';
import { moduleLogic } from './core_gameplay_logic.js';
import { ui } from './core_gameplay_ui.js';

const coreGameplayManifest = {
    id: "core_gameplay",
    name: "Core Gameplay",
    version: "0.1.0",
    description: "Provides the initial manual click-to-gain resource mechanic and basic game interaction.",
    dependencies: [], // No specific module dependencies for this one

    /**
     * Initializes the Core Gameplay module.
     * This function is called by the moduleLoader.
     * @param {object} coreSystems - References to core game systems (logger, resourceManager, etc.).
     * @returns {object} The module's public API or instance.
     */
    async initialize(coreSystems) {
        const { staticDataAggregator, coreGameStateManager, coreResourceManager, coreUIManager, decimalUtility, loggingSystem } = coreSystems;

        loggingSystem.info(this.name, `Initializing ${this.name} v${this.version}...`);

        // 1. Register Static Data (e.g., resource definitions, UI text)
        // The 'studyPoints' resource is defined in main.js for new games if no save exists.
        // This module can still register its own static data if needed, or ensure the resource is properly set up.
        // For now, we assume 'studyPoints' is defined by main.js or loaded.
        // staticDataAggregator.registerStaticData(this.id, staticModuleData);
        // Let's ensure "Study Points" is defined if not already (e.g. if main.js logic changes)
        if (!coreResourceManager.isResourceDefined('studyPoints')) {
            loggingSystem.warn(this.name, "'studyPoints' resource not found. Defining it now.");
             staticDataAggregator.registerStaticData('core_resource_definitions', { // Use the same sourceId as main.js
                studyPoints: {
                    id: 'studyPoints',
                    name: "Study Points",
                    initialAmount: 0,
                    isUnlocked: true,
                    showInUI: true
                }
            });
            const spDef = staticDataAggregator.getData('core_resource_definitions.studyPoints');
            if (spDef) {
                coreResourceManager.defineResource(spDef.id, spDef.name, spDef.initialAmount, spDef.showInUI, spDef.isUnlocked);
            }
        }


        // 2. Initialize Module State
        // Load state from coreGameStateManager or use defaults
        let currentModuleState = coreGameStateManager.getModuleState(this.id);
        if (!currentModuleState) {
            loggingSystem.info(this.name, "No saved state found. Initializing with default state.");
            currentModuleState = getInitialState();
            coreGameStateManager.setModuleState(this.id, currentModuleState);
        } else {
            loggingSystem.info(this.name, "Loaded state from CoreGameStateManager.", currentModuleState);
            // Ensure the global moduleState object is updated (if it's imported directly by other module files)
            Object.assign(moduleState, currentModuleState);
        }
        // Further ensure moduleState is correctly populated, especially with Decimals if any.
        // For this simple module, state is minimal.

        // 3. Initialize Logic (pass references to core systems and state)
        moduleLogic.initialize(coreSystems, moduleState);

        // 4. Initialize UI
        ui.initialize(coreSystems, moduleState, moduleLogic); // Pass logic for button clicks
        // Register the module's main tab/view with the UIManager
        coreUIManager.registerMenuTab(
            this.id,
            "Study Area", // Tab Label
            (parentElement) => ui.renderMainContent(parentElement), // Function to render content
            () => true, // isUnlocked check (always true for this basic module)
            () => ui.onShow(),   // onShow callback
            () => ui.onHide(),    // onHide callback
            true // isDefaultTab
        );

        loggingSystem.info(this.name, `${this.name} initialized successfully.`);

        // Return a public API for the module if needed
        return {
            id: this.id,
            logic: moduleLogic,
            ui: ui,
            // Expose a method to be called on game load if specific re-initialization is needed
            onGameLoad: () => {
                loggingSystem.info(this.name, `onGameLoad called for ${this.name}. Reloading state.`);
                let loadedState = coreGameStateManager.getModuleState(this.id);
                if (!loadedState) {
                    loadedState = getInitialState();
                    coreGameStateManager.setModuleState(this.id, loadedState);
                }
                Object.assign(moduleState, loadedState); // Update local moduleState
                // ui.updateDisplay(); // If UI needs explicit refresh based on new state
                if (coreUIManager.isActiveTab(this.id)) { // Hypothetical UIManager method
                    ui.renderMainContent(document.getElementById('main-content')); // Re-render if active
                }
            },
            onResetState: () => {
                loggingSystem.info(this.name, `onResetState called for ${this.name}. Resetting state.`);
                const initialState = getInitialState();
                Object.assign(moduleState, initialState);
                coreGameStateManager.setModuleState(this.id, initialState);
                 if (coreUIManager.isActiveTab(this.id)) {
                    ui.renderMainContent(document.getElementById('main-content'));
                }
            }
        };
    }
};

export default coreGameplayManifest;
