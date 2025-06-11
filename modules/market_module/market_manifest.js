// modules/market_module/market_manifest.js (v3.0 - Roadmap Refactor)

/**
 * @file market_manifest.js
 * @description Manifest file for the Market Module.
 * v3.0: Refactored for roadmap. Removed all automation logic and dependencies.
 * v2.1: Automator state now persists through prestige resets.
 */

import { staticModuleData } from './market_data.js';
import { getInitialState, moduleState } from './market_state.js';
import { moduleLogic } from './market_logic.js';
import { ui } from './market_ui.js';

const marketManifest = {
    id: "market",
    name: "Market",
    version: "3.0.0", 
    description: "Trade resources and unlock game features.",
    dependencies: ["studies"], 

    async initialize(coreSystems) {
        const { staticDataAggregator, coreGameStateManager, coreResourceManager, coreUIManager, decimalUtility, loggingSystem, gameLoop } = coreSystems;

        loggingSystem.info(this.name, `Initializing ${this.name} v${this.version}...`);

        // Register new data structure
        staticDataAggregator.registerStaticData(this.id, {
            resources: staticModuleData.resources, 
            featureUnlocks: staticModuleData.featureUnlocks,
            skillPoints: staticModuleData.skillPoints,
            ui: staticModuleData.ui
        });

        loggingSystem.debug(this.name, "Defining/Redefining resources for Market module.");
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
        Object.assign(moduleState, currentModuleState); 
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
        
        // No more automation logic to register in the game loop.
        
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
                // Now, on prestige, we only need to reset the purchase counts.
                loggingSystem.info(this.name, `onPrestigeReset called for ${this.name}.`);
                
                const initialState = getInitialState();
                Object.assign(moduleState, initialState);
                coreGameStateManager.setModuleState(this.id, { ...moduleState });
                
                loggingSystem.info(this.name, `Market state reset for prestige.`);

                if (coreUIManager.isActiveTab(this.id)) {
                    ui.renderMainContent(document.getElementById('main-content'));
                }
            }
        };
    }
};

export default marketManifest;
