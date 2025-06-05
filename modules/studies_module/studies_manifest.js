// modules/studies_module/studies_manifest.js (v2)

/**
 * @file studies_manifest.js
 * @description Manifest file for the Studies Module.
 * Integrates with CoreUpgradeManager.
 */

import { staticModuleData } from './studies_data.js';
import { getInitialState, moduleState } from './studies_state.js';
import { moduleLogic } from './studies_logic.js'; // Now v2
import { ui } from './studies_ui.js';

const studiesManifest = {
    id: "studies",
    name: "Studies",
    version: "0.2.0", // Version bump
    description: "Automate your Study Point generation and unlock new knowledge. Applies skill effects.",
    dependencies: ["core_gameplay"],

    async initialize(coreSystems) {
        const { staticDataAggregator, coreGameStateManager, coreResourceManager, coreUIManager, decimalUtility, loggingSystem, gameLoop, coreUpgradeManager } = coreSystems;
        // coreUpgradeManager is now available via coreSystems

        loggingSystem.info(this.name, `Initializing ${this.name} v${this.version}...`);

        // 1. Register Static Data
        staticDataAggregator.registerStaticData(this.id, {
            resources: staticModuleData.resources,
            producers: staticModuleData.producers,
            ui: staticModuleData.ui
        });

        const knowledgeDef = staticModuleData.resources.knowledge;
        if (knowledgeDef && !coreResourceManager.isResourceDefined(knowledgeDef.id)) {
            coreResourceManager.defineResource(
                knowledgeDef.id,
                knowledgeDef.name,
                decimalUtility.new(knowledgeDef.initialAmount),
                knowledgeDef.showInUI,
                knowledgeDef.isUnlocked
            );
        }

        // 2. Initialize Module State
        let currentModuleState = coreGameStateManager.getModuleState(this.id);
        if (!currentModuleState) {
            currentModuleState = getInitialState();
        } else {
            for (const producerId in currentModuleState.ownedProducers) {
                currentModuleState.ownedProducers[producerId] = decimalUtility.new(currentModuleState.ownedProducers[producerId] || "0").toString();
            }
        }
        Object.assign(moduleState, currentModuleState);
        coreGameStateManager.setModuleState(this.id, { ...moduleState });

        // 3. Initialize Logic (v2 logic now uses coreUpgradeManager from coreSystems)
        moduleLogic.initialize(coreSystems);

        // 4. Initialize UI
        ui.initialize(coreSystems, moduleLogic); // Pass logic v2

        // 5. Register Menu Tab
        coreUIManager.registerMenuTab(
            this.id,
            staticModuleData.ui.studiesTabLabel,
            (parentElement) => ui.renderMainContent(parentElement),
            () => moduleLogic.isStudiesTabUnlocked(),
            () => ui.onShow(),
            () => ui.onHide()
        );

        // 6. Register update callbacks
        gameLoop.registerUpdateCallback('generalLogic', (deltaTime) => {
            moduleLogic.updateGlobalFlags();
            // Production calculations are now more reactive to effect changes,
            // so might not need to call updateAllProducerProductions every tick unless effects change outside of skill purchases.
            // For now, let's assume effects are relatively static between purchases or major events.
            // However, if global multipliers change often, this might be needed.
            // The Studies UI updateDynamicElements will call calculateProducerCost and updateProducerProduction,
            // which now inherently use coreUpgradeManager.
        });
        gameLoop.registerUpdateCallback('uiUpdate', (deltaTime) => {
             if (coreUIManager.isActiveTab(this.id) || Object.values(staticModuleData.producers).some(p => decimalUtility.gt(moduleState.ownedProducers[p.id] || 0, 0))) {
                // Update UI if tab is active OR if any producers are owned (because their production might change due to global effects)
                moduleLogic.updateAllProducerProductions(); // Recalculate all productions first
                ui.updateDynamicElements(); // Then update UI
            }
        });
        
        moduleLogic.updateAllProducerProductions(); // Initial calculation
        moduleLogic.updateGlobalFlags();

        loggingSystem.info(this.name, `${this.name} initialized successfully.`);

        return {
            id: this.id,
            logic: moduleLogic,
            ui: ui,
            onGameLoad: () => {
                loggingSystem.info(this.name, `onGameLoad called for ${this.name} (v2).`);
                let loadedState = coreGameStateManager.getModuleState(this.id);
                if (!loadedState) loadedState = getInitialState();
                else {
                    for (const producerId in loadedState.ownedProducers) {
                         loadedState.ownedProducers[producerId] = decimalUtility.new(loadedState.ownedProducers[producerId] || "0").toString();
                    }
                }
                Object.assign(moduleState, loadedState);
                coreGameStateManager.setModuleState(this.id, { ...moduleState });
                moduleLogic.onGameLoad(); // Notifies logic, which updates productions considering upgrades
                if (coreUIManager.isActiveTab(this.id)) {
                    ui.renderMainContent(document.getElementById('main-content'));
                } else {
                    ui.updateDynamicElements(); // Still update if not active but has producers
                }
            },
            onResetState: () => {
                loggingSystem.info(this.name, `onResetState called for ${this.name} (v2).`);
                const initialState = getInitialState();
                Object.assign(moduleState, initialState);
                coreGameStateManager.setModuleState(this.id, initialState);
                moduleLogic.onResetState();
                if (coreUIManager.isActiveTab(this.id)) {
                    ui.renderMainContent(document.getElementById('main-content'));
                } else {
                     ui.updateDynamicElements();
                }
            },
            getProducerData: (producerId) => { // For achievements or other modules
                const producerDef = staticModuleData.producers[producerId];
                if(!producerDef) return { owned: decimalUtility.new(0), production: decimalUtility.new(0)};
                return {
                    owned: moduleLogic.getOwnedProducerCount(producerId),
                    production: coreResourceManager.getProductionFromSource(producerDef.resourceId, `studies_module_${producerId}`)
                };
            }
        };
    }
};

export default studiesManifest;
