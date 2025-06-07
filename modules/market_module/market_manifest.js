// modules/market_module/market_manifest.js (v2.0 - Added Automator Game Loop Hook)

/**
 * @file market_manifest.js
 * @description Manifest file for the Market Module.
 * v2.0: Hooks the automation processing logic into the game loop.
 * v1.4: Ensures correct definition of 'prestigeSkillPoints' on init/reset.
 */

import { staticModuleData } from './market_data.js';
import { getInitialState, moduleState } from './market_state.js';
import { moduleLogic } from './market_logic.js';
import { ui } from './market_ui.js';

const marketManifest = {
    id: "market",
    name: "Market",
    version: "2.0.0", // Version bump for new features
    description: "Trade resources, unlock features, and manage automations.",
    dependencies: ["studies"], 

    async initialize(coreSystems) {
        const { staticDataAggregator, coreGameStateManager, coreResourceManager, coreUIManager, decimalUtility, loggingSystem, gameLoop } = coreSystems;

        loggingSystem.info(this.name, `Initializing ${this.name} v${this.version}...`);

        staticDataAggregator.registerStaticData(this.id, {
            resources: staticModuleData.resources, 
            marketItems: staticModuleData.marketItems,
            marketUnlocks: staticModuleData.marketUnlocks,
            marketAutomations: staticModuleData.marketAutomations, // --- NEW ---
            ui: staticModuleData.ui
        });

        loggingSystem.debug(this.name, "Defining/Redefining resources from market_data.js for Market module.");
        for (const resourceKey in staticModuleData.resources) {
            const resDef = staticModuleData.resources[resourceKey];
            loggingSystem.info(this.name, `Calling coreResourceManager.defineResource for Market's '${resDef.id}'. Name: ${resDef.name}, InitialAmount: ${resDef.initialAmount}, ShowInUI: ${resDef.showInUI}, IsUnlocked: ${resDef.isUnlocked}, HasProdRate: ${resDef.hasProductionRate}`);
            
            coreResourceManager.defineResource(
                resDef.id,
                resDef.name,
                decimalUtility.new(resDef.initialAmount), 
                resDef.showInUI,
                resDef.isUnlocked,
                resDef.hasProductionRate !== undefined ? resDef.hasProductionRate : true
            );
             const checkRes = coreResourceManager.getResource(resDef.id);
             if (checkRes) {
                loggingSystem.info(this.name, `State of '${resDef.id}' in CRM after Market definition: isUnlocked=${checkRes.isUnlocked}, showInUI=${checkRes.showInUI}, amount=${checkRes.amount.toString()}`);
             } else {
                loggingSystem.error(this.name, `Resource '${resDef.id}' FAILED to be defined by Market manifest.`);
             }
        }

        const initialState = getInitialState();
        let currentModuleState = coreGameStateManager.getModuleState(this.id) || initialState;

        // Safely merge loaded state with initial state structure to handle new fields in updates
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

        // --- FEATURE: Register automation and UI updates to the game loop ---
        gameLoop.registerUpdateCallback('generalLogic', (deltaTime) => {
            moduleLogic.processImageAutomation(deltaTime);
        });
        
        gameLoop.registerUpdateCallback('uiUpdate', (deltaTime) => {
            if (coreUIManager.isActiveTab(this.id)) {
                ui.updateDynamicElements();
            }
        });
        // --- END FEATURE ---

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
                loggingSystem.info(this.name, `onPrestigeReset called for ${this.name}.`);
                const stateOnPrestige = getInitialState();
                Object.assign(moduleState, stateOnPrestige);
                coreGameStateManager.setModuleState(this.id, stateOnPrestige);
                if (coreUIManager.isActiveTab(this.id)) {
                    ui.renderMainContent(document.getElementById('main-content'));
                }
            }
        };
    }
};

export default marketManifest;
