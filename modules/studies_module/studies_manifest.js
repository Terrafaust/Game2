// modules/studies_module/studies_manifest.js (v3.1 - Persistent Unlock)

/**
 * @file studies_manifest.js
 * @description Manifest file for the Studies Module.
 * v3.1: Uses studies_logic_v3.3 for persistent tab unlock.
 */

import { staticModuleData } from './studies_data.js'; // v3
import { getInitialState, moduleState } from './studies_state.js';
import { moduleLogic } from './studies_logic.js'; // v3.3
import { ui } from './studies_ui.js';

const studiesManifest = {
    id: "studies",
    name: "Studies",
    version: "0.2.3", // Version bump for unlock logic change
    description: "Automate your Study Point generation and unlock new knowledge. Applies skill effects.",
    dependencies: ["core_gameplay"],

    async initialize(coreSystems) {
        const { staticDataAggregator, coreGameStateManager, coreResourceManager, coreUIManager, decimalUtility, loggingSystem, gameLoop } = coreSystems;

        // --- Diagnostic Log Added ---
        if (coreSystems && coreSystems.loggingSystem) {
            coreSystems.loggingSystem.debug("StudiesManifest_Init", "coreSystems received in manifest:", 
                Object.keys(coreSystems), 
                "Has decimalUtility:", !!(coreSystems.decimalUtility)
            );
            if (!coreSystems.decimalUtility) {
                coreSystems.loggingSystem.error("StudiesManifest_Init_CRITICAL", "decimalUtility is MISSING in coreSystems received by manifest!");
            }
        } else {
            console.error("StudiesManifest_Init_CRITICAL: coreSystems or loggingSystem missing in manifest!", coreSystems);
        }
        // --- End Diagnostic Log ---

        loggingSystem.info(this.name, `Initializing ${this.name} v${this.version}...`);

        staticDataAggregator.registerStaticData(this.id, {
            resources: staticModuleData.resources,
            producers: staticModuleData.producers,
            ui: staticModuleData.ui
        });

        const knowledgeDef = staticModuleData.resources.knowledge;
        if (knowledgeDef) {
            coreResourceManager.defineResource(
                knowledgeDef.id,
                knowledgeDef.name,
                decimalUtility.new(knowledgeDef.initialAmount),
                knowledgeDef.showInUI,
                knowledgeDef.isUnlocked
            );
        }

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

        moduleLogic.initialize(coreSystems);
        ui.initialize(coreSystems, moduleLogic);

        coreUIManager.registerMenuTab(
            this.id,
            staticModuleData.ui.studiesTabLabel,
            (parentElement) => ui.renderMainContent(parentElement),
            () => moduleLogic.isStudiesTabUnlocked(), // This now checks the permanent flag
            () => ui.onShow(),
            () => ui.onHide()
        );

        gameLoop.registerUpdateCallback('generalLogic', (deltaTime) => {
            moduleLogic.updateGlobalFlags();
            if (!coreGameStateManager.getGlobalFlag('studiesTabPermanentlyUnlocked', false)) {
                 if(moduleLogic.isStudiesTabUnlocked()){
                 }
            }
        });
        gameLoop.registerUpdateCallback('uiUpdate', (deltaTime) => {
             if (coreUIManager.isActiveTab(this.id) || Object.values(staticModuleData.producers).some(p => decimalUtility.gt(moduleState.ownedProducers[p.id] || "0", 0))) {
                moduleLogic.updateAllProducerProductions(); 
                ui.updateDynamicElements(); 
            }
        });
        
        moduleLogic.onGameLoad();

        loggingSystem.info(this.name, `${this.name} initialized successfully.`);

        return {
            id: this.id,
            logic: moduleLogic,
            ui: ui,
            onGameLoad: () => {
                loggingSystem.info(this.name, `onGameLoad called for ${this.name} (manifest v${this.version}).`);
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
                loggingSystem.info(this.name, `onResetState called for ${this.name} (manifest v${this.version}).`);
                const initialState = getInitialState();
                Object.assign(moduleState, initialState);
                coreGameStateManager.setModuleState(this.id, initialState);
                moduleLogic.onResetState(); // This will clear 'studiesTabPermanentlyUnlocked'
                if (coreUIManager.isActiveTab(this.id)) {
                    ui.renderMainContent(document.getElementById('main-content'));
                } else {
                     ui.updateDynamicElements();
                }
            },
            onPrestigeReset: () => {
                loggingSystem.info(this.name, `onPrestigeReset called for ${this.name}.`);
                const initialState = getInitialState();
                Object.assign(moduleState, initialState);
                coreGameStateManager.setModuleState(this.id, initialState);
                moduleLogic.updateAllProducerProductions(); // This will effectively set production to 0
                if (coreUIManager.isActiveTab(this.id)) {
                    ui.renderMainContent(document.getElementById('main-content'));
                }
            },
            getProducerData: (producerId) => { 
                const producerDef = staticModuleData.producers[producerId];
                if(!producerDef || !coreSystems.decimalUtility) return { owned: new Decimal(0), production: new Decimal(0)}; // Guard against missing decimalUtility
                const { decimalUtility } = coreSystems;
                return {
                    owned: moduleLogic.getOwnedProducerCount(producerId),
                    production: coreResourceManager.getProductionFromSource(producerDef.resourceId, `studies_module_${producerId}`)
                };
            }
        };
    }
};

export default studiesManifest;
