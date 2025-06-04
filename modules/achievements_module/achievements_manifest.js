// modules/achievements_module/achievements_manifest.js 

/**
 * @file achievements_manifest.js
 * @description Manifest file for the Achievements Module.
 * This module introduces a system for in-game achievements with rewards.
 */

// Import module components
import { staticModuleData } from './achievements_data.js';
import { getInitialState, moduleState } from './achievements_state.js';
import { moduleLogic } from './achievements_logic.js';
import { ui } from './achievements_ui.js';

const achievementsManifest = {
    id: "achievements",
    name: "Achievements",
    version: "0.1.0",
    description: "Complete challenges to earn powerful permanent rewards.",
    dependencies: ["commerce", "studies", "core_gameplay", "skills"], // Depends on commerce for unlock, studies for producers, core_gameplay for clicks, skills for skill levels

    /**
     * Initializes the Achievements module.
     * This function is called by the moduleLoader.
     * @param {object} coreSystems - References to core game systems (logger, resourceManager, etc.).
     * @returns {object} The module's public API or instance.
     */
    async initialize(coreSystems) {
        const { staticDataAggregator, coreGameStateManager, coreResourceManager, coreUIManager, decimalUtility, loggingSystem, gameLoop } = coreSystems;

        loggingSystem.info(this.name, `Initializing ${this.name} v${this.version}...`);

        // 1. Register Static Data
        staticDataAggregator.registerStaticData(this.id, {
            categories: staticModuleData.categories,
            achievements: staticModuleData.achievements,
            ui: staticModuleData.ui
        });

        // 2. Initialize Module State
        let currentModuleState = coreGameStateManager.getModuleState(this.id);
        if (!currentModuleState) {
            loggingSystem.info(this.name, "No saved state found for Achievements module. Initializing with default state.");
            currentModuleState = getInitialState(staticModuleData); // Pass staticModuleData
            coreGameStateManager.setModuleState(this.id, currentModuleState);
        } else {
            loggingSystem.info(this.name, "Loaded state from CoreGameStateManager for Achievements module.", currentModuleState);
            // No Decimal conversion needed for boolean flags, but ensure consistency
            for (const achId in staticModuleData.achievements) { // Use staticModuleData to ensure all achievements are covered
                if (typeof currentModuleState.unlockedAchievements[achId] === 'undefined') {
                    currentModuleState.unlockedAchievements[achId] = false; // Add new achievements if not in save
                }
            }
            Object.assign(moduleState, currentModuleState); // Update local moduleState
        }

        // 3. Initialize Logic (pass references to core systems)
        moduleLogic.initialize(coreSystems);

        // 4. Initialize UI (pass references to core systems and logic)
        ui.initialize(coreSystems, moduleLogic);

        // 5. Register the module's main tab/view with the UIManager
        coreUIManager.registerMenuTab(
            this.id,
            staticModuleData.ui.achievementsTabLabel, // Tab Label from data
            (parentElement) => ui.renderMainContent(parentElement), // Function to render content
            () => moduleLogic.isAchievementsTabUnlocked(), // isUnlocked check
            () => ui.onShow(),   // onShow callback
            () => ui.onHide()    // onHide callback
        );

        // 6. Register update callbacks with the game loop
        gameLoop.registerUpdateCallback('generalLogic', (deltaTime) => {
            moduleLogic.checkAchievementConditions(); // Check conditions periodically
        });
        gameLoop.registerUpdateCallback('uiUpdate', (deltaTime) => {
            ui.updateDynamicElements(); // Update UI elements like progress, status
        });

        // Initial application of all unlocked achievement rewards after state is loaded/initialized
        moduleLogic.applyAllUnlockedAchievementRewards();


        loggingSystem.info(this.name, `${this.name} initialized successfully.`);

        // Return a public API for the module if needed
        return {
            id: this.id,
            logic: moduleLogic,
            ui: ui,
            staticModuleData: staticModuleData, // Expose static data for other modules (e.g., Statistics)
            // Expose lifecycle methods for moduleLoader to broadcast
            onGameLoad: () => {
                loggingSystem.info(this.name, `onGameLoad called for ${this.name}. Reloading state.`);
                let loadedState = coreGameStateManager.getModuleState(this.id);
                if (!loadedState) {
                    loadedState = getInitialState(staticModuleData); // Pass staticModuleData
                    coreGameStateManager.setModuleState(this.id, loadedState);
                }
                // Ensure consistency for new achievements or missing flags
                for (const achId in staticModuleData.achievements) { // Use staticModuleData to ensure all achievements are covered
                    if (typeof loadedState.unlockedAchievements[achId] === 'undefined') {
                        loadedState.unlockedAchievements[achId] = false;
                    }
                }
                Object.assign(moduleState, loadedState); // Update local moduleState
                moduleLogic.onGameLoad(); // Notify logic component
                if (coreUIManager.isActiveTab(this.id)) {
                    ui.renderMainContent(document.getElementById('main-content')); // Re-render if active
                }
            },
            onResetState: () => {
                loggingSystem.info(this.name, `onResetState called for ${this.name}. Resetting state.`);
                const initialState = getInitialState(staticModuleData); // Pass staticModuleData
                Object.assign(moduleState, initialState);
                coreGameStateManager.setModuleState(this.id, initialState);
                moduleLogic.onResetState(); // Notify logic component
                 if (coreUIManager.isActiveTab(this.id)) {
                    ui.renderMainContent(document.getElementById('main-content'));
                }
            },
            // Public method to check if an achievement is unlocked
            isAchievementUnlocked: (achievementId) => moduleLogic.isAchievementUnlocked(achievementId)
        };
    }
};

export default achievementsManifest;
