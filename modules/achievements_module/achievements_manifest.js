// modules/achievements_module/achievements_manifest.js (v1)

/**
 * @file achievements_manifest.js
 * @description Manifest file for the Achievements Module.
 */

import { staticModuleData } from './achievements_data.js';
import { getInitialState, moduleState } from './achievements_state.js';
import { moduleLogic } from './achievements_logic.js';
import { ui } from './achievements_ui.js';

const achievementsManifest = {
    id: "achievements",
    name: "Achievements",
    version: "1.0.0",
    description: "Track your accomplishments and earn rewards.",
    dependencies: ["studies", "market", "coreUpgradeManager"], // Depends on studies for data, market for unlock flag

    async initialize(coreSystems) {
        const { staticDataAggregator, coreGameStateManager, loggingSystem, coreUIManager, gameLoop, decimalUtility } = coreSystems;

        loggingSystem.info(this.name, `Initializing ${this.name} v${this.version}...`);

        // 1. Register Static Data
        staticDataAggregator.registerStaticData(this.id, staticModuleData);

        // 2. Initialize Module State
        let currentModuleState = coreGameStateManager.getModuleState(this.id);
        if (!currentModuleState || typeof currentModuleState.completedAchievements === 'undefined') {
            currentModuleState = getInitialState();
        }
        Object.assign(moduleState, currentModuleState);
        coreGameStateManager.setModuleState(this.id, { ...moduleState });

        // 3. Initialize Logic
        moduleLogic.initialize(coreSystems);

        // 4. Initialize UI
        ui.initialize(coreSystems, moduleState, moduleLogic);

        // 5. Register Menu Tab
        coreUIManager.registerMenuTab(
            this.id,
            staticModuleData.ui.achievementsTabLabel,
            (parentElement) => ui.renderMainContent(parentElement),
            () => moduleLogic.isAchievementsTabUnlocked(),
            () => ui.onShow(),
            () => ui.onHide()
        );

        // 6. Register update callback to check for achievements
        gameLoop.registerUpdateCallback('generalLogic', (deltaTimeSeconds) => {
            // Check achievements periodically (e.g., every few seconds or less frequently if performance is a concern)
            // For now, check every game tick.
            moduleLogic.checkAndCompleteAchievements();
        });
        
        // Initial check on load
        moduleLogic.onGameLoad();


        loggingSystem.info(this.name, `${this.name} initialized successfully.`);

        return {
            id: this.id,
            logic: moduleLogic,
            ui: ui,
            onGameLoad: () => {
                loggingSystem.info(this.name, `onGameLoad called for ${this.name}.`);
                let loadedState = coreGameStateManager.getModuleState(this.id);
                if (!loadedState || typeof loadedState.completedAchievements === 'undefined') {
                    loadedState = getInitialState();
                }
                Object.assign(moduleState, loadedState);
                coreGameStateManager.setModuleState(this.id, { ...moduleState });
                moduleLogic.onGameLoad(); // This will re-apply completed rewards
                if (coreUIManager.isActiveTab(this.id)) {
                    ui.updateDynamicElements();
                }
            },
            onResetState: () => {
                loggingSystem.info(this.name, `onResetState called for ${this.name}.`);
                const initialState = getInitialState();
                Object.assign(moduleState, initialState);
                coreGameStateManager.setModuleState(this.id, initialState);
                moduleLogic.onResetState();
                 if (coreUIManager.isActiveTab(this.id)) {
                    ui.updateDynamicElements();
                }
            }
            // No getSpecificData needed from this module for now by others.
        };
    }
};

export default achievementsManifest;

