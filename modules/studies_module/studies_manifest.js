// modules/studies_module/studies_manifest.js (v3)

/**
 * @file studies_manifest.js
 * @description Manifest file for the Studies Module.
 * v3: Ensures correct initial definition of Knowledge resource.
 */

import { staticModuleData } from './studies_data.js'; // v3
import { getInitialState, moduleState } from './studies_state.js';
import { moduleLogic } from './studies_logic.js'; // v3
import { ui } from './studies_ui.js';

const studiesManifest = {
    id: "studies",
    name: "Studies",
    version: "0.2.1", // Minor version bump for fixes
    description: "Automate your Study Point generation and unlock new knowledge. Applies skill effects.",
    dependencies: ["core_gameplay"],

    async initialize(coreSystems) {
        const { staticDataAggregator, coreGameStateManager, coreResourceManager, coreUIManager, decimalUtility, loggingSystem, gameLoop } = coreSystems;

        loggingSystem.info(this.name, `Initializing ${this.name} v${this.version}...`);

        // 1. Register Static Data
        staticDataAggregator.registerStaticData(this.id, {
            resources: staticModuleData.resources,
            producers: staticModuleData.producers,
            ui: staticModuleData.ui
        });

        // Define the 'knowledge' resource with coreResourceManager
        // Ensure it uses the initial isUnlocked and showInUI values from data.
        const knowledgeDef = staticModuleData.resources.knowledge;
        if (knowledgeDef) {
            // Define if not already defined OR if being re-defined ensure it respects initial locked/hidden state
            // coreResourceManager's defineResource will log if it's a redefinition.
            coreResourceManager.defineResource(
                knowledgeDef.id,
                knowledgeDef.name,
                decimalUtility.new(knowledgeDef.initialAmount),
                knowledgeDef.showInUI,   // Will be false initially from studies_data_v3
                knowledgeDef.isUnlocked  // Will be false initially from studies_data_v3
            );
            loggingSystem.info(this.name, `Resource '${knowledgeDef.name}' (${knowledgeDef.id}) defined with initial showInUI: ${knowledgeDef.showInUI}, isUnlocked: ${knowledgeDef.isUnlocked}.`);
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

        // 3. Initialize Logic
        moduleLogic.initialize(coreSystems);

        // 4. Initialize UI
        ui.initialize(coreSystems, moduleLogic);

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
        });
        gameLoop.registerUpdateCallback('uiUpdate', (deltaTime) => {
             if (coreUIManager.isActiveTab(this.id) || Object.values(staticModuleData.producers).some(p => decimalUtility.gt(moduleState.ownedProducers[p.id] || "0", 0))) {
                moduleLogic.updateAllProducerProductions(); 
                ui.updateDynamicElements(); 
            }
        });
        
        // Initial update calls
        moduleLogic.onGameLoad(); // This will call updateAllProducerProductions and updateGlobalFlags
                                  // and also handle Knowledge visibility based on loaded state.

        loggingSystem.info(this.name, `${this.name} initialized successfully.`);

        return {
            id: this.id,
            logic: moduleLogic,
            ui: ui,
            onGameLoad: () => {
                loggingSystem.info(this.name, `onGameLoad called for ${this.name} (v3).`);
                let loadedState = coreGameStateManager.getModuleState(this.id);
                if (!loadedState) loadedState = getInitialState();
                else {
                    for (const producerId in loadedState.ownedProducers) {
                         loadedState.ownedProducers[producerId] = decimalUtility.new(loadedState.ownedProducers[producerId] || "0").toString();
                    }
                }
                Object.assign(moduleState, loadedState);
                coreGameStateManager.setModuleState(this.id, { ...moduleState });
                moduleLogic.onGameLoad(); 
                if (coreUIManager.isActiveTab(this.id)) {
                    ui.renderMainContent(document.getElementById('main-content'));
                } else {
                    ui.updateDynamicElements(); 
                }
            },
            onResetState: () => {
                loggingSystem.info(this.name, `onResetState called for ${this.name} (v3).`);
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
            getProducerData: (producerId) => { 
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
