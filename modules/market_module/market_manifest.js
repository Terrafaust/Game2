// modules/market_module/market_manifest.js (v1)

/**
 * @file market_manifest.js
 * @description Manifest file for the Market Module.
 * Allows purchasing Images, Study Skill Points, and unlocking game features.
 */

import { staticModuleData } from './market_data.js';
import { getInitialState, moduleState } from './market_state.js';
import { moduleLogic } from './market_logic.js';
import { ui } from './market_ui.js';

const marketManifest = {
    id: "market",
    name: "Market",
    version: "1.0.0",
    description: "Trade resources for items and unlock new game features.",
    dependencies: ["studies"], // Depends on studies for the 'marketUnlocked' flag

    /**
     * Initializes the Market module.
     * @param {object} coreSystems - References to core game systems.
     * @returns {object} The module's public API or instance.
     */
    async initialize(coreSystems) {
        const { staticDataAggregator, coreGameStateManager, coreResourceManager, coreUIManager, decimalUtility, loggingSystem, gameLoop } = coreSystems;

        loggingSystem.info(this.name, `Initializing ${this.name} v${this.version}...`);

        // 1. Register Static Data (resources this module introduces)
        staticDataAggregator.registerStaticData(this.id, {
            resources: staticModuleData.resources,
            marketItems: staticModuleData.marketItems,
            marketUnlocks: staticModuleData.marketUnlocks,
            ui: staticModuleData.ui
        });

        // Define new resources with coreResourceManager
        for (const resourceKey in staticModuleData.resources) {
            const resDef = staticModuleData.resources[resourceKey];
            if (!coreResourceManager.isResourceDefined(resDef.id)) {
                 coreResourceManager.defineResource(
                    resDef.id,
                    resDef.name,
                    decimalUtility.new(resDef.initialAmount),
                    resDef.showInUI,
                    resDef.isUnlocked // Market resources are typically available if market tab is.
                                      // Actual unlock driven by market tab visibility.
                );
                loggingSystem.info(this.name, `Resource '${resDef.name}' (${resDef.id}) defined.`);
            }
        }

        // 2. Initialize Module State
        let currentModuleState = coreGameStateManager.getModuleState(this.id);
        if (!currentModuleState || !currentModuleState.purchaseCounts) { // Check for specific state structure
            loggingSystem.info(this.name, "No saved state or malformed state found for Market. Initializing with default.");
            currentModuleState = getInitialState();
        } else {
            loggingSystem.info(this.name, "Loaded state from CoreGameStateManager for Market module.", currentModuleState);
             // Ensure purchaseCounts are valid Decimals (or strings representing them)
            const defaultPurchaseCounts = getInitialState().purchaseCounts;
            for (const key in defaultPurchaseCounts) {
                if (!currentModuleState.purchaseCounts.hasOwnProperty(key) || typeof currentModuleState.purchaseCounts[key] === 'undefined') {
                    currentModuleState.purchaseCounts[key] = defaultPurchaseCounts[key];
                } else {
                     // Ensure it's stored as a string for consistency, logic will convert to Decimal
                    currentModuleState.purchaseCounts[key] = decimalUtility.new(currentModuleState.purchaseCounts[key]).toString();
                }
            }
        }
        Object.assign(moduleState, currentModuleState); // Update local reactive state
        coreGameStateManager.setModuleState(this.id, { ...moduleState }); // Persist potentially cleaned state


        // 3. Initialize Logic
        moduleLogic.initialize(coreSystems);

        // 4. Initialize UI
        ui.initialize(coreSystems, moduleState, moduleLogic);

        // 5. Register Menu Tab
        coreUIManager.registerMenuTab(
            this.id,
            staticModuleData.ui.marketTabLabel,
            (parentElement) => ui.renderMainContent(parentElement),
            () => moduleLogic.isMarketTabUnlocked(), // Unlock condition
            () => ui.onShow(),
            () => ui.onHide()
        );

        // 6. Register update callbacks with the game loop (if needed for dynamic UI updates)
        gameLoop.registerUpdateCallback('uiUpdate', (deltaTime) => {
            if (coreUIManager.isActiveTab(this.id)) {
                ui.updateDynamicElements();
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
                 if (!loadedState || !loadedState.purchaseCounts) {
                    loadedState = getInitialState();
                } else {
                    // Ensure purchaseCounts are valid strings for Decimal conversion
                    const defaultPurchaseCounts = getInitialState().purchaseCounts;
                     for (const key in defaultPurchaseCounts) {
                        if (!loadedState.purchaseCounts.hasOwnProperty(key) || typeof loadedState.purchaseCounts[key] === 'undefined') {
                            loadedState.purchaseCounts[key] = defaultPurchaseCounts[key];
                        } else {
                            loadedState.purchaseCounts[key] = decimalUtility.new(loadedState.purchaseCounts[key]).toString();
                        }
                    }
                }
                Object.assign(moduleState, loadedState);
                coreGameStateManager.setModuleState(this.id, { ...moduleState }); // Persist potentially cleaned state
                moduleLogic.onGameLoad();
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

export default marketManifest;
