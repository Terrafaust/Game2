// js/core/saveLoadSystem.js (v4.1 - Initialization Fix)
// Adds an initialize method to get a reference to all core systems.
// Fixes a crash in resetGameData by allowing it to safely access the gameLoop.

import { loggingSystem } from './loggingSystem.js';
import { decimalUtility } from './decimalUtility.js';
import { coreGameStateManager } from './coreGameStateManager.js';
import { coreResourceManager } from './coreResourceManager.js';
import { coreUIManager } from './coreUIManager.js';
import { moduleLoader } from './moduleLoader.js';
import { globalSettingsManager } from './globalSettingsManager.js';

const SAVE_KEY = 'incrementalGameSaveData_v3';
let coreSystemsRef = null; // Reference to all core systems

function decimalReplacer(key, value) {
    if (decimalUtility.isDecimal(value)) {
        return value.toString();
    }
    return value;
}

export const saveLoadSystem = {
    // MODIFICATION: Added initialize function
    initialize(coreSystems) {
        coreSystemsRef = coreSystems;
        loggingSystem.info("SaveLoadSystem", "Save/Load System initialized.");
    },

    saveGame() {
        loggingSystem.info("SaveLoadSystem", "Attempting to save game...");
        try {
            const gameStateToSave = coreGameStateManager.getGameState();
            const resourceState = coreResourceManager.getSaveData();
            const fullSaveData = {
                version: coreGameStateManager.getGameVersion(),
                timestamp: Date.now(),
                gameState: gameStateToSave,
                resourceState: resourceState,
            };
            const serializedData = JSON.stringify(fullSaveData, decimalReplacer);
            localStorage.setItem(SAVE_KEY, serializedData);
            coreGameStateManager.updateLastSaveTime(fullSaveData.timestamp);
            coreUIManager.showNotification('ui.notifications.game_saved', "success");
            return true;
        } catch (error) {
            loggingSystem.error("SaveLoadSystem", "Error saving game:", error);
            coreUIManager.showNotification('ui.notifications.error_saving', "error", 5000, { replacements: { error: error.message } });
            return false;
        }
    },

    loadGame() {
        loggingSystem.info("SaveLoadSystem", "Attempting to load game...");
        try {
            const serializedData = localStorage.getItem(SAVE_KEY);
            if (!serializedData) {
                loggingSystem.info("SaveLoadSystem", "No save data found.");
                return false;
            }

            const loadedFullData = JSON.parse(serializedData);

            if (loadedFullData.gameState) {
                coreGameStateManager.setFullGameState(loadedFullData.gameState);
            }
            if (loadedFullData.resourceState) {
                coreResourceManager.loadSaveData(loadedFullData.resourceState);
            }

            coreGameStateManager.updateLastSaveTime(loadedFullData.timestamp || Date.now());

            moduleLoader.notifyAllModulesOfLoad();
            coreUIManager.fullUIRefresh();

            loggingSystem.info("SaveLoadSystem", "Game loaded successfully.");
            coreUIManager.showNotification('ui.notifications.game_loaded', "success");
            return true;

        } catch (error) {
            loggingSystem.error("SaveLoadSystem", "Error loading game:", error);
            coreUIManager.showNotification("Error loading game. Save may be corrupted.", "error", 7000);
            this.resetGameData(true);
            return false;
        }
    },

    resetGameData(isLoadFailure = false) {
        loggingSystem.warn("SaveLoadSystem", "Initiating hard game reset...");

        // MODIFICATION: Safely stop the game loop using the coreSystemsRef
        if (coreSystemsRef && coreSystemsRef.gameLoop) {
            coreSystemsRef.gameLoop.stop();
        } else {
            loggingSystem.error("SaveLoadSystem", "Cannot stop game loop: coreSystemsRef not initialized.");
        }

        localStorage.removeItem(SAVE_KEY);

        coreGameStateManager.resetState();
        coreResourceManager.resetState();
        globalSettingsManager.resetToDefaults();
        
        moduleLoader.resetAllModules();
        
        coreUIManager.showNotification('ui.notifications.game_reset', "warning", 5000);
        loggingSystem.info("SaveLoadSystem", "Game data has been reset. Reloading page for clean state.");

        setTimeout(() => window.location.reload(), 1000);
    }
};
