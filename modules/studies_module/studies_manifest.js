// modules/studies_module/studies_manifest.js 

/**
 * @file studies_manifest.js
 * @description Manifest file for the Studies Module.
 * This module introduces automated resource generation and content unlocking.
 */

// Import module components
import { staticModuleData } from './studies_data.js';
import { getInitialState, moduleState } from './studies_state.js';
import { moduleLogic } from './studies_logic.js';
import { ui } from './studies_ui.js';

const studiesManifest = {
    id: "studies",
    name: "Studies",
    version: "0.1.0",
    description: "Automate your Study Point generation and unlock new knowledge.",
    dependencies: ["core_gameplay"], // Depends on core_gameplay for Study Points

    /**
     * Initializes the Studies module.
     * This function is called by the moduleLoader.
     * @param {object} coreSystems - References to core game systems (logger, resourceManager, etc.).
     * @returns {object} The module's public API or instance.
     */
    async initialize(coreSystems) {
        const { staticDataAggregator, coreGameStateManager, coreResourceManager, coreUIManager, decimalUtility, loggingSystem, gameLoop } = coreSystems;

        loggingSystem.info(this.name, `Initializing ${this.name} v${this.version}...`);

        // 1. Register Static Data
        // Register the 'knowledge' resource definition
        staticDataAggregator.registerStaticData(this.id, {
            resources: staticModuleData.resources,
            producers: staticModuleData.producers,
            ui: staticModuleData.ui
        });

        // Define the 'knowledge' resource with coreResourceManager
        const knowledgeDef = staticModuleData.resources.knowledge;
        if (knowledgeDef) {
            coreResourceManager.defineResource(
                knowledgeDef.id,
                knowledgeDef.name,
                knowledgeDef.initialAmount,
                knowledgeDef.showInUI,
                knowledgeDef.isUnlocked
            );
            loggingSystem.info(this.name, `Resource '${knowledgeDef.name}' (${knowledgeDef.id}) defined.`);
        }

        // 2. Initialize Module State
        let currentModuleState = coreGameStateManager.getModuleState(this.id);
        if (!currentModuleState) {
            loggingSystem.info(this.name, "No saved state found for Studies module. Initializing with default state.");
            currentModuleState = getInitialState();
            coreGameStateManager.setModuleState(this.id, currentModuleState);
        } else {
            loggingSystem.info(this.name, "Loaded state from CoreGameStateManager for Studies module.", currentModuleState);
            // Ensure Decimal values are revived from strings in loaded state
            for (const producerId in currentModuleState.ownedProducers) {
                currentModuleState.ownedProducers[producerId] = decimalUtility.new(currentModuleState.ownedProducers[producerId]).toString(); // Ensure it's a string, logic will convert
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
            staticModuleData.ui.studiesTabLabel, // Tab Label from data
            (parentElement) => ui.renderMainContent(parentElement), // Function to render content
            () => moduleLogic.isStudiesTabUnlocked(), // isUnlocked check
            () => ui.onShow(),   // onShow callback
            () => ui.onHide()    // onHide callback
        );

        // 6. Register update callbacks with the game loop
        gameLoop.registerUpdateCallback('generalLogic', (deltaTime) => {
            // This module's logic might not have a continuous update function itself,
            // but it might trigger global flag checks here.
            moduleLogic.updateGlobalFlags(); // Check for global flag unlocks periodically
        });
        gameLoop.registerUpdateCallback('uiUpdate', (deltaTime) => {
            ui.updateDynamicElements(); // Update UI elements like costs, owned counts, production
        });

        // Initial update of all producer productions after state is loaded/initialized
        moduleLogic.updateAllProducerProductions();
        // Initial check for global flags
        moduleLogic.updateGlobalFlags();


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
                // Ensure Decimals are revived when loading into moduleState
                for (const producerId in loadedState.ownedProducers) {
                    loadedState.ownedProducers[producerId] = decimalUtility.new(loadedState.ownedProducers[producerId]).toString();
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
            // Add a public method to retrieve producer data for other modules (e.g., for achievements)
            getProducerData: (producerId) => {
                return {
                    owned: moduleLogic.getOwnedProducerCount(producerId),
                    production: coreResourceManager.getProductionFromSource(staticModuleData.producers[producerId].resourceId, `studies_module_${producerId}`)
                };
            },
            staticModuleData: staticModuleData // Expose static data for other modules (e.g., Achievements)
        };
    }
};

export default studiesManifest;
