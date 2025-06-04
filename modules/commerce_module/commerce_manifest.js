// modules/commerce_module/commerce_manifest.js 

/**
 * @file commerce_manifest.js
 * @description Manifest file for the Commerce Module.
 * This module introduces new resources ("Images", "Study Skill Points")
 * and items to purchase, including unlocks for other main menu tabs.
 */

// Import module components
import { staticModuleData } from './commerce_data.js';
import { getInitialState, moduleState } from './commerce_state.js';
import { moduleLogic } from './commerce_logic.js';
import { ui } from './commerce_ui.js';

const commerceManifest = {
    id: "commerce",
    name: "Commerce",
    version: "0.1.0",
    description: "Acquire new resources and unlock advanced game features.",
    dependencies: ["studies"], // Depends on studies for 'commerceUnlocked' flag and Study Points

    /**
     * Initializes the Commerce module.
     * This function is called by the moduleLoader.
     * @param {object} coreSystems - References to core game systems (logger, resourceManager, etc.).
     * @returns {object} The module's public API or instance.
     */
    async initialize(coreSystems) {
        const { staticDataAggregator, coreGameStateManager, coreResourceManager, coreUIManager, decimalUtility, loggingSystem, gameLoop } = coreSystems;

        loggingSystem.info(this.name, `Initializing ${this.name} v${this.version}...`);

        // 1. Register Static Data
        staticDataAggregator.registerStaticData(this.id, {
            resources: staticModuleData.resources,
            purchasables: staticModuleData.purchasables,
            ui: staticModuleData.ui
        });

        // Define new resources with coreResourceManager
        for (const resId in staticModuleData.resources) {
            const resDef = staticModuleData.resources[resId];
            coreResourceManager.defineResource(
                resDef.id,
                resDef.name,
                resDef.initialAmount,
                resDef.showInUI,
                resDef.isUnlocked
            );
            loggingSystem.info(this.name, `Resource '${resDef.name}' (${resDef.id}) defined.`);
        }

        // 2. Initialize Module State
        let currentModuleState = coreGameStateManager.getModuleState(this.id);
        if (!currentModuleState) {
            loggingSystem.info(this.name, "No saved state found for Commerce module. Initializing with default state.");
            currentModuleState = getInitialState();
            coreGameStateManager.setModuleState(this.id, currentModuleState);
        } else {
            loggingSystem.info(this.name, "Loaded state from CoreGameStateManager for Commerce module.", currentModuleState);
            // Ensure Decimal values are revived from strings in loaded state for ownedPurchasables
            for (const purchasableId in currentModuleState.ownedPurchasables) {
                currentModuleState.ownedPurchasables[purchasableId] = decimalUtility.new(currentModuleState.ownedPurchasables[purchasableId]).toString();
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
            staticModuleData.ui.commerceTabLabel, // Tab Label from data
            (parentElement) => ui.renderMainContent(parentElement), // Function to render content
            () => moduleLogic.isCommerceTabUnlocked(), // isUnlocked check
            () => ui.onShow(),   // onShow callback
            () => ui.onHide()    // onHide callback
        );

        // 6. Register update callbacks with the game loop
        gameLoop.registerUpdateCallback('generalLogic', (deltaTime) => {
            // This module's logic might not have a continuous update function itself,
            // but it might trigger global flag checks here.
            // No specific global flags are set *by* commerce logic itself based on continuous updates,
            // flags are set on purchase.
        });
        gameLoop.registerUpdateCallback('resourceGeneration', (deltaTime) => {
            // Update resource generation for Image and Skill Point generators
            moduleLogic.updateAllGeneratorProductions();
        });
        gameLoop.registerUpdateCallback('uiUpdate', (deltaTime) => {
            ui.updateDynamicElements(); // Update UI elements like costs, owned counts
        });

        // Initial update of all generator productions after state is loaded/initialized
        moduleLogic.updateAllGeneratorProductions();


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
                for (const purchasableId in loadedState.ownedPurchasables) {
                    loadedState.ownedPurchasables[purchasableId] = decimalUtility.new(loadedState.ownedPurchasables[purchasableId]).toString();
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
            // Public method to check if a specific unlock has been purchased
            isUnlockPurchased: (unlockId) => {
                const purchasableDef = staticModuleData.purchasables[unlockId];
                if (purchasableDef && purchasableDef.setsGlobalFlag) {
                    return coreGameStateManager.getGlobalFlag(purchasableDef.setsGlobalFlag.flag);
                }
                return false;
            }
        };
    }
};

export default commerceManifest;
