// modules/market_module/market_manifest.js (v1.2 - Logging Resource Definition)

/**
 * @file market_manifest.js
 * @description Manifest file for the Market Module.
 * v1.2: Added more specific logging for resource definition calls.
 * v1.1: Ensures resources are always (re)defined by this module to update properties like isUnlocked.
 */

import { staticModuleData } from './market_data.js';
import { getInitialState, moduleState } from './market_state.js';
import { moduleLogic } from './market_logic.js';
import { ui } from './market_ui.js';

const marketManifest = {
    id: "market",
    name: "Market",
    version: "1.0.2", // Version bump
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
                resDef.showInUI,
                resDef.isUnlocked, 
                resDef.hasProductionRate !== undefined ? resDef.hasProductionRate : true
            );
            // Check state immediately after definition
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
                for (const resourceKey in staticModuleData.resources) { // Ensure market resource props on game load
                    const resDef = staticModuleData.resources[resourceKey];
                     loggingSystem.debug(this.name, `onGameLoad: Re-asserting Market's definition for '${resDef.id}'. IsUnlocked: ${resDef.isUnlocked}, ShowInUI: ${resDef.showInUI}`);
                    coreResourceManager.defineResource(
                        resDef.id, resDef.name, decimalUtility.new(resDef.initialAmount),
                        resDef.showInUI, resDef.isUnlocked, 
                        resDef.hasProductionRate !== undefined ? resDef.hasProductionRate : true
                    );
                     const checkRes = coreResourceManager.getResource(resDef.id);
                     if (checkRes) loggingSystem.debug(this.name, `State of '${resDef.id}' post onGameLoad define: isUnlocked=${checkRes.isUnlocked}, showInUI=${checkRes.showInUI}`);
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
                moduleLogic.onGameLoad();
                if (coreUIManager.isActiveTab(this.id)) {
                    const mainContentEl = document.getElementById('main-content');
                    if (mainContentEl) ui.renderMainContent(mainContentEl);
                }
            },
            onResetState: () => {
                loggingSystem.info(this.name, `onResetState called for ${this.name}. Ensuring resource definitions and resetting state.`);
                 for (const resourceKey in staticModuleData.resources) { // Ensure market resource props on reset
                    const resDef = staticModuleData.resources[resourceKey];
                     loggingSystem.debug(this.name, `onResetState: Re-asserting Market's definition for '${resDef.id}'. IsUnlocked: ${resDef.isUnlocked}, ShowInUI: ${resDef.showInUI}`);
                    coreResourceManager.defineResource(
                        resDef.id, resDef.name, decimalUtility.new(resDef.initialAmount),
                        resDef.showInUI, resDef.isUnlocked, 
                        resDef.hasProductionRate !== undefined ? resDef.hasProductionRate : true
                    );
                     const checkRes = coreResourceManager.getResource(resDef.id);
                     if (checkRes) loggingSystem.debug(this.name, `State of '${resDef.id}' post onResetState define: isUnlocked=${checkRes.isUnlocked}, showInUI=${checkRes.showInUI}`);
                }
                const initialState = getInitialState();
                Object.assign(moduleState, initialState);
                coreGameStateManager.setModuleState(this.id, { ...moduleState });
                moduleLogic.onResetState();
                if (coreUIManager.isActiveTab(this.id)) {
                    const mainContentEl = document.getElementById('main-content');
                    if (mainContentEl) ui.renderMainContent(mainContentEl);
                }
            }
        };
    }
};

export default marketManifest;
