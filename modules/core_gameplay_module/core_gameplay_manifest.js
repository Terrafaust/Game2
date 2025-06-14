// modules/core_gameplay_module/core_gameplay_manifest.js (v3.1 - Final Translation Key Fix)
// This version ensures the menu tab is registered with a translation key.

import { staticModuleData } from './core_gameplay_data.js';
import { getInitialState, moduleState } from './core_gameplay_state.js';
import { moduleLogic } from './core_gameplay_logic.js';
import { ui } from './core_gameplay_ui.js';
import { RESOURCES, MODULES } from '../../js/core/constants.js';

const coreGameplayManifest = {
    id: MODULES.CORE_GAMEPLAY,
    name: "Core Gameplay",
    version: "3.1.0",
    description: "Provides the initial manual click-to-gain resource mechanic.",
    dependencies: [],

    async initialize(coreSystems) {
        const { staticDataAggregator, coreGameStateManager, coreResourceManager, coreUIManager, loggingSystem } = coreSystems;

        loggingSystem.info(this.name, `Initializing ${this.name} v${this.version}...`);

        staticDataAggregator.registerStaticData(this.id, staticModuleData);

        const spDef = staticModuleData.resources[RESOURCES.STUDY_POINTS];
        if (spDef) {
            coreResourceManager.defineResource(
                spDef.id, spDef.name, spDef.initialAmount, spDef.showInUI, spDef.isUnlocked, spDef.hasProductionRate
            );
        }

        let currentModuleState = coreGameStateManager.getModuleState(this.id) || getInitialState();
        Object.assign(moduleState, currentModuleState);

        moduleLogic.initialize(coreSystems);
        ui.initialize(coreSystems, moduleLogic);
        
        // FINAL FIX: The label for the tab must be the translation key.
        coreUIManager.registerMenuTab(
            this.id,
            "core_gameplay.ui.tab_label",
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
