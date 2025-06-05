// modules/market_module/market_manifest.js (v1.3 - Resource Reset Logic)

/**
 * @file market_manifest.js
 * @description Manifest file for the Market Module.
 * v1.3: Ensures correct re-definition of 'images' on reset.
 * v1.2: Added more specific logging for resource definition calls.
 */

import { staticModuleData } from './market_data.js';
import { getInitialState, moduleState } from './market_state.js';
import { moduleLogic } from './market_logic.js';
import { ui } from './market_ui.js';

const marketManifest = {
    id: "market",
    name: "Market",
    version: "1.0.3", 
    description: "Trade resources for items and unlock new game features.",
    dependencies: ["studies"], 

    async initialize(coreSystems) {
        const { staticDataAggregator, coreGameStateManager, coreResourceManager, coreUIManager, decimalUtility, loggingSystem, gameLoop } = coreSystems;

        loggingSystem.info(this.name, `Initializing ${this.name} v${this.version}...`);

        staticDataAggregator.registerStaticData(this.id, {
            resources: staticModuleData.resources, 
            marketItems: staticModuleData.marketItems,
            marketUnlocks: staticModuleData.marketUnlocks,
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
                resDef.showInUI, // Use the value from market_data.js
                resDef.isUnlocked,  // Use the value from market_data.js
                resDef.hasProductionRate !== undefined ? resDef.hasProductionRate : true
            );
             const checkRes = coreResourceManager.getResource(resDef.id);
             if (checkRes) {
                loggingSystem.info(this.name, `State of '${resDef.id}' in CRM after Market definition: isUnlocked=${checkRes.isUnlocked}, showInUI=${checkRes.showInUI}, amount=${checkRes.amount.toString()}`);
             } else {
                loggingSystem.error(this.name, `Resource '${resDef.id}' FAILED to be defined by Market manifest.`);
             }
        }

        let currentModuleState = coreGameStateManager.getModuleState(this.id);
        if (!currentModuleState || !currentModuleState.purchaseCounts) { 
            currentModuleState = getInitialState();
        } else {
            const defaultPurchaseCounts = getInitialState().purchaseCounts;
            for (const key in defaultPurchaseCounts) {
                if (!currentModuleState.purchaseCounts.hasOwnProperty(key) || typeof currentModuleState.purchaseCounts[key] === 'undefined') {
                    currentModuleState.purchaseCounts[key] = defaultPurchaseCounts[key];
                } else {
                    currentModuleState.purchaseCounts[key] = decimalUtility.new(currentModuleState.purchaseCounts[key]).toString();
                }
            }
        }
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
                loggingSystem.info(this.name, `onGameLoad called for ${this.name}. Ensuring resource definitions and loading state.`);
                for (const resourceKey in staticModuleData.resources) { 
                    const resDef = staticModuleData.resources[resourceKey];
                     loggingSystem.debug(this.name, `onGameLoad: Re-asserting Market's definition for '${resDef.id}'. IsUnlocked: ${resDef.isUnlocked}, ShowInUI: ${resDef.showInUI}`);
                    coreResourceManager.defineResource(
                        resDef.id, resDef.name, decimalUtility.new(resDef.initialAmount), // Initial amount might be overridden by loadSaveData if save exists
                        resDef.showInUI, resDef.isUnlocked, 
                        resDef.hasProductionRate !== undefined ? resDef.hasProductionRate : true
                    );
                     const checkRes = coreResourceManager.getResource(resDef.id);
                     if (checkRes) loggingSystem.debug(this.name, `State of '${resDef.id}' post onGameLoad define: isUnlocked=${checkRes.isUnlocked}, showInUI=${checkRes.showInUI}, amount=${checkRes.amount.toString()}`);
                }

                let loadedState = coreGameStateManager.getModuleState(this.id);
                 if (!loadedState || !loadedState.purchaseCounts) {
                    loadedState = getInitialState();
                } else {
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
                coreGameStateManager.setModuleState(this.id, { ...moduleState }); 
                moduleLogic.onGameLoad(); // This now also handles visibility of 'images' based on loaded amount.
                if (coreUIManager.isActiveTab(this.id)) {
                    const mainContentEl = document.getElementById('main-content');
                    if (mainContentEl) ui.renderMainContent(mainContentEl);
                }
            },
            onResetState: () => {
                loggingSystem.info(this.name, `onResetState called for ${this.name}. Ensuring resource definitions and resetting state.`);
                 for (const resourceKey in staticModuleData.resources) { 
                    const resDef = staticModuleData.resources[resourceKey];
                     loggingSystem.debug(this.name, `onResetState: Re-asserting Market's definition for '${resDef.id}'. IsUnlocked: ${resDef.isUnlocked}, ShowInUI: ${resDef.showInUI}`);
                    
                    // On HARD reset, explicitly set images to be hidden and locked as per its updated static data.
                    let resetShowInUI = resDef.id === 'images' ? false : resDef.showInUI;
                    let resetIsUnlocked = resDef.id === 'images' ? false : resDef.isUnlocked;

                    coreResourceManager.defineResource(
                        resDef.id, resDef.name, decimalUtility.new(resDef.initialAmount),
                        resetShowInUI, resetIsUnlocked, 
                        resDef.hasProductionRate !== undefined ? resDef.hasProductionRate : true
                    );
                     const checkRes = coreResourceManager.getResource(resDef.id);
                     if (checkRes) loggingSystem.debug(this.name, `State of '${resDef.id}' post onResetState define: isUnlocked=${checkRes.isUnlocked}, showInUI=${checkRes.showInUI}`);
                }
                const initialState = getInitialState();
                Object.assign(moduleState, initialState);
                coreGameStateManager.setModuleState(this.id, { ...moduleState });
                moduleLogic.onResetState(); // This also calls defineResource for images with false/false
                if (coreUIManager.isActiveTab(this.id)) {
                    const mainContentEl = document.getElementById('main-content');
                    if (mainContentEl) ui.renderMainContent(mainContentEl);
                }
            }
        };
    }
};

export default marketManifest;
