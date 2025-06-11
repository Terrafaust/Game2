// js/modules/core_gameplay_module/core_gameplay_manifest.js (v2 - Refactored)
// Now registers its own resource definition.

import { staticModuleData } from './core_gameplay_data.js';
import { getInitialState, moduleState } from './core_gameplay_state.js';
import { moduleLogic } from './core_gameplay_logic.js';
import { ui } from './core_gameplay_ui.js';
import { RESOURCES, MODULES } from '../../core/constants.js';

const coreGameplayManifest = {
    id: MODULES.CORE_GAMEPLAY,
    name: "Core Gameplay",
    version: "2.0.0",
    description: "Provides the initial manual click-to-gain resource mechanic.",
    dependencies: [],

    async initialize(coreSystems) {
        const { staticDataAggregator, coreGameStateManager, coreResourceManager, coreUIManager, loggingSystem } = coreSystems;

        loggingSystem.info(this.name, `Initializing ${this.name} v${this.version}...`);

        // Register all static data from this module
        staticDataAggregator.registerStaticData(this.id, staticModuleData);

        // Define the resource this module introduces
        const spDef = staticModuleData.resources[RESOURCES.STUDY_POINTS];
        if (spDef) {
            coreResourceManager.defineResource(
                spDef.id, spDef.name, spDef.initialAmount, spDef.showInUI, spDef.isUnlocked, spDef.hasProductionRate
            );
        }

        // Initialize state
        let currentModuleState = coreGameStateManager.getModuleState(this.id) || getInitialState();
        Object.assign(moduleState, currentModuleState);

        // Initialize logic and UI
        moduleLogic.initialize(coreSystems);
        ui.initialize(coreSystems, moduleLogic);
        
        // Register UI Tab
        coreUIManager.registerMenuTab(
            this.id,
            "Study Area",
            (parentElement) => ui.renderMainContent(parentElement),
            () => true, // Always unlocked
            () => ui.onShow(),
            () => ui.onHide(),
            true // isDefaultTab
        );

        loggingSystem.info(this.name, `${this.name} initialized successfully.`);

        return {
            id: this.id,
            logic: moduleLogic,
            ui: ui,
            onGameLoad: () => {
                loggingSystem.info(this.name, `onGameLoad called for ${this.name}.`);
                let loadedState = coreGameStateManager.getModuleState(this.id) || getInitialState();
                Object.assign(moduleState, loadedState);
                if (coreUIManager.isActiveTab(this.id)) {
                    ui.renderMainContent(document.getElementById('main-content'));
                }
            },
            onResetState: () => {
                loggingSystem.info(this.name, `onResetState called for ${this.name}.`);
                const initialState = getInitialState();
                Object.assign(moduleState, initialState);
                coreGameStateManager.setModuleState(this.id, initialState);
                 if (coreUIManager.isActiveTab(this.id)) {
                    ui.renderMainContent(document.getElementById('main-content'));
                }
            }
        };
    }
};

export default coreGameplayManifest;
