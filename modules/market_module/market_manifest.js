// modules/market_module/market_manifest.js (v2.1 - Persistent Automator on Prestige)

/**
 * @file market_manifest.js
 * @description Manifest file for the Market Module.
 * v2.1: Automator state now persists through prestige resets.
 * v2.0: Hooks the automation processing logic into the game loop.
 */

import { staticModuleData } from './market_data.js';
import { getInitialState, moduleState } from './market_state.js';
import { moduleLogic } from './market_logic.js';
import { ui } from './market_ui.js';

const marketManifest = {
    id: "market",
    name: "Market",
    version: "2.1.0", 
    description: "Trade resources, unlock features, and manage automations.",
    dependencies: ["studies"], 

    async initialize(coreSystems) {
        const { staticDataAggregator, coreGameStateManager, coreResourceManager, coreUIManager, decimalUtility, loggingSystem, gameLoop } = coreSystems;

        loggingSystem.info(this.name, `Initializing ${this.name} v${this.version}...`);

        staticDataAggregator.registerStaticData(this.id, {
            resources: staticModuleData.resources, 
            marketItems: staticModuleData.marketItems,
            marketUnlocks: staticModuleData.marketUnlocks,
            marketAutomations: staticModuleData.marketAutomations,
            ui: staticModuleData.ui
        });

        loggingSystem.debug(this.name, "Defining/Redefining resources from market_data.js for Market module.");
        for (const resourceKey in staticModuleData.resources) {
            const resDef = staticModuleData.resources[resourceKey];
            coreResourceManager.defineResource(
                resDef.id,
                resDef.name,
                decimalUtility.new(resDef.initialAmount), 
                resDef.showInUI,
                resDef.isUnlocked,
                resDef.hasProductionRate !== undefined ? resDef.hasProductionRate : true
            );
        }

        const initialState = getInitialState();
        let currentModuleState = coreGameStateManager.getModuleState(this.id) || initialState;

        const finalState = {
            purchaseCounts: { ...initialState.purchaseCounts, ...(currentModuleState.purchaseCounts || {}) },
            automatorLevels: { ...initialState.automatorLevels, ...(currentModuleState.automatorLevels || {}) },
            automationProgress: { ...initialState.automationProgress, ...(currentModuleState.automationProgress || {}) }
        };
        Object.assign(moduleState, finalState); 
        coreGameStateManager.setModuleState(this.id, { ...moduleState }); 

        moduleLogic.initialize(coreSystems);
        ui.initialize(coreSystems, moduleState, moduleLogic);

        coreUIManager.registerMenuTab(
            this.id,
            staticModuleData.ui.marketTabLabel,
            (parentElement) => ui.renderMainContent(parentElement),
            () => moduleLogic.isMarketTabUnlocked(), 
            () => ui.onShow(),
            () => ui.onHide()
        );

        gameLoop.registerUpdateCallback('generalLogic', (deltaTime) => {
            moduleLogic.processImageAutomation(deltaTime);
        });
        
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
                loggingSystem.info(this.name, `onGameLoad called for ${this.name}.`);
                moduleLogic.onGameLoad();
                if (coreUIManager.isActiveTab(this.id)) {
                    const mainContentEl = document.getElementById('main-content');
                    if (mainContentEl) ui.renderMainContent(mainContentEl);
                }
            },
            onResetState: () => {
                loggingSystem.info(this.name, `onResetState called for ${this.name}.`);
                moduleLogic.onResetState();
                if (coreUIManager.isActiveTab(this.id)) {
                    const mainContentEl = document.getElementById('main-content');
                    if (mainContentEl) ui.renderMainContent(mainContentEl);
                }
            },
            onPrestigeReset: () => {
                // --- MODIFICATION: Preserve automator levels on prestige ---
                loggingSystem.info(this.name, `onPrestigeReset called for ${this.name}.`);
                
                // Get a fresh initial state, which has reset purchase counts
                const initialState = getInitialState();

                // Create a new state object for prestige reset
                const stateOnPrestige = {
                    // Reset purchase counts
                    purchaseCounts: initialState.purchaseCounts,
                    // Keep the current automator levels and progress
                    automatorLevels: moduleState.automatorLevels,
                    automationProgress: moduleState.automationProgress
                };

                // Apply the new selective state
                Object.assign(moduleState, stateOnPrestige);
                coreGameStateManager.setModuleState(this.id, stateOnPrestige);
                
                loggingSystem.info(this.name, `Market state partially reset for prestige. Automators preserved.`, stateOnPrestige);

                if (coreUIManager.isActiveTab(this.id)) {
                    ui.renderMainContent(document.getElementById('main-content'));
                }
                // --- END MODIFICATION ---
            }
        };
    }
};

export default marketManifest;
